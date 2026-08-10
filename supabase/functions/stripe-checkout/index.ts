import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

// CORS
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// Map (plan_id, cycle) -> Stripe Price ID via env vars.
// Expected env layout:
//   STRIPE_PRICE_PREMIUM_MONTHLY, STRIPE_PRICE_PREMIUM_YEARLY
//   STRIPE_PRICE_FAMILY_MONTHLY,  STRIPE_PRICE_FAMILY_YEARLY
//   STRIPE_PRICE_PREMIUM_PLUS_MONTHLY, STRIPE_PRICE_PREMIUM_PLUS_YEARLY
function priceIdFor(planId: string, cycle: string): string | null {
  const prefix = `STRIPE_PRICE_${planId.toUpperCase()}_${cycle.toUpperCase()}`;
  return Deno.env.get(prefix) ?? null;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse({}, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405);

    if (!stripeSecret) {
      return corsResponse(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs in project secrets.' },
        503,
      );
    }

    const stripe = new Stripe(stripeSecret, { appInfo: { name: 'Mafo', version: '1.0.0' } });

    const body = await req.json().catch(() => ({}));
    const { plan_id, cycle, email, user_id, is_trial } = body;

    if (!plan_id || !cycle || !user_id) {
      return corsResponse({ error: 'Missing required fields: plan_id, cycle, user_id' }, 400);
    }
    if (!['monthly', 'yearly'].includes(cycle)) {
      return corsResponse({ error: 'Invalid cycle. Must be monthly or yearly.' }, 400);
    }

    const priceId = priceIdFor(plan_id, cycle);
    if (!priceId) {
      return corsResponse(
        { error: `No Stripe price configured for plan "${plan_id}" (${cycle}). Set STRIPE_PRICE_${plan_id.toUpperCase()}_${cycle.toUpperCase()}.` },
        503,
      );
    }

    // Authenticate the user via the anon Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'Missing Authorization header' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }
    if (user.id !== user_id) {
      return corsResponse({ error: 'User ID mismatch' }, 403);
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://mafo.app';
    const successUrl = `${origin}/?checkout=success&provider=stripe`;
    const cancelUrl = `${origin}/?checkout=cancel&provider=stripe`;

    // Find or create the Stripe customer.
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let customerId = customer?.customer_id;
    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        email: email || user.email,
        metadata: { userId: user.id },
      });
      const { error: insErr } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });
      if (insErr) {
        try { await stripe.customers.del(newCustomer.id); } catch { /* ignore */ }
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }
      customerId = newCustomer.id;
    }

    // If a trial is requested, pass trial_end (3 days) to Stripe Checkout.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: user.id, plan_id, cycle, is_trial: String(!!is_trial) },
      client_reference_id: user.id,
    };
    if (is_trial) {
      // 3-day trial, no upfront charge.
      sessionParams.subscription_data = {
        trial_period_days: 3,
        metadata: { user_id: user.id, plan_id, cycle },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Record a pending subscription row so the gate can reflect "trialing"
    // immediately if the user returns before the webhook lands.
    await supabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_id,
        cycle,
        provider: 'stripe',
        status: is_trial ? 'trialing' : 'past_due',
        trial_ends_at: is_trial ? new Date(Date.now() + 3 * 86400000).toISOString() : null,
        stripe_customer_id: customerId,
      },
      { onConflict: 'user_id' },
    );

    return corsResponse({ url: session.url, sessionId: session.id, provider: 'stripe' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Checkout error: ${message}`);
    return corsResponse({ error: message }, 500);
  }
});
