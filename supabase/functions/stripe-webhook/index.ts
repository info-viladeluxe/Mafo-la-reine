import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

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

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Stripe exige le corps BRUT (non parsé) pour vérifier la signature
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      return corsResponse({ error: 'Missing stripe-signature header' }, 400);
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Webhook signature verification failed: ${msg}`);
      return corsResponse({ error: `Webhook signature verification failed` }, 400);
    }

    // On répond tout de suite à Stripe, puis on traite en arrière-plan
    EdgeRuntime.waitUntil(handleEvent(event));

    return corsResponse({ received: true }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Webhook error: ${message}`);
    return corsResponse({ error: message }, 500);
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object as Record<string, unknown>;

  if (!stripeData) return;

  if (!('customer' in stripeData)) {
    console.log(`Event ${event.type} has no customer, skipping`);
    return;
  }

  // Uniquement les modes de paiement supportés
  if (event.type === 'checkout.session.completed' && stripeData.mode === 'subscription') {
    console.log(`Processing checkout.session.completed for subscription`);
    await syncCustomerFromStripe(stripeData.customer as string);
    return;
  }

  if (event.type === 'checkout.session.completed' && stripeData.mode === 'payment') {
    console.log(`Processing one-time payment checkout.session.completed`);
    await handleOneTimePayment(stripeData);
    return;
  }

  const relevantSubscriptionEvents = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
  ];

  if (relevantSubscriptionEvents.includes(event.type)) {
    await syncCustomerFromStripe(stripeData.customer as string);
  }
}

async function handleOneTimePayment(session: Stripe.Checkout.Session) {
  const {
    id: checkout_session_id,
    payment_intent,
    customer: customerId,
    amount_subtotal,
    amount_total,
    currency,
  } = session;

  const { error: orderError } = await supabase.from('stripe_orders').insert({
    checkout_session_id,
    payment_intent_id: payment_intent as string,
    customer_id: customerId as string,
    amount_subtotal: amount_subtotal ?? 0,
    amount_total: amount_total ?? 0,
    currency: currency ?? 'usd',
    payment_status: session.payment_status,
    status: 'completed',
  });

  if (orderError) {
    console.error('Error inserting order:', orderError);
    return;
  }
  console.log(`Recorded one-time payment order for session ${checkout_session_id}`);
}

// Map a Stripe Price ID back to (plan_id, cycle) using env vars, mirroring
// stripe-checkout's priceIdFor(). Falls back to session metadata if available.
function planFromPriceId(priceId: string | null | undefined): { plan_id: string | null; cycle: 'monthly' | 'yearly' | null } {
  if (!priceId) return { plan_id: null, cycle: null };
  const plans: Array<'premium' | 'family' | 'premium_plus'> = ['premium', 'family', 'premium_plus'];
  for (const p of plans) {
    for (const c of ['monthly', 'yearly'] as const) {
      const envPrice = Deno.env.get(`STRIPE_PRICE_${p.toUpperCase()}_${c.toUpperCase()}`);
      if (envPrice && envPrice === priceId) return { plan_id: p, cycle: c };
    }
  }
  return { plan_id: null, cycle: null };
}

// Bridge the Stripe subscription state into the `subscriptions` table that the
// frontend access gate actually reads. Without this, a successful Stripe payment
// would update `stripe_subscriptions` but never open the app gate.
async function syncMafoSubscription(customerId: string, stripeSub: Stripe.Subscription) {
  const { data: customerRow } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle();

  const userId = customerRow?.user_id;
  if (!userId) {
    console.log(`No user mapped to Stripe customer ${customerId}, skipping Mafo subscription sync`);
    return;
  }

  const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null;
  const { plan_id: envPlan, cycle: envCycle } = planFromPriceId(priceId);

  // Prefer metadata (set at checkout time) when env mapping is missing.
  const planId = (stripeSub.metadata?.plan_id as string) || envPlan || 'premium';
  const cycle = (stripeSub.metadata?.cycle as 'monthly' | 'yearly') || envCycle || 'monthly';

  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'canceled',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    paused: 'past_due',
  };
  const mafoStatus = statusMap[stripeSub.status] ?? 'past_due';

  const periodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = stripeSub.trial_end
    ? new Date(stripeSub.trial_end * 1000).toISOString()
    : null;

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: planId,
      cycle,
      provider: 'stripe',
      status: mafoStatus,
      current_period_end: periodEnd,
      trial_ends_at: trialEnd,
      cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSub.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('Error syncing Mafo subscription:', error);
  } else {
    console.log(`Synced Mafo subscription for user ${userId} (status=${mafoStatus})`);
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.log(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
        },
        { onConflict: 'customer_id' },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
      }
      return;
    }

    const subscription = subscriptions.data[0];

    // Bridge into the Mafo `subscriptions` table (read by the access gate).
    await syncMafoSubscription(customerId, subscription);

    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_method_brand:
          subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
            ? subscription.default_payment_method.card?.brand ?? null
            : null,
        payment_method_last4:
          subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
            ? subscription.default_payment_method.card?.last4 ?? null
            : null,
        status: subscription.status,
      },
      { onConflict: 'customer_id' },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.log(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
