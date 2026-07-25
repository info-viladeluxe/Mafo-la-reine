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
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return corsResponse({ error: `Webhook signature verification failed` }, 400);
    }

    // On répond tout de suite à Stripe, puis on traite en arrière-plan
    EdgeRuntime.waitUntil(handleEvent(event));

    return corsResponse({ received: true }, 200);
  } catch (error: any) {
    console.error(`Webhook error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object as any;

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
