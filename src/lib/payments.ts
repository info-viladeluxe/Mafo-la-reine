import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export type BillingCycle = 'monthly' | 'yearly';
export type PlanId = 'premium' | 'family' | 'premium_plus';
export type ProviderId = 'stripe' | 'flutterwave';

export interface Plan {
  id: PlanId;
  nameKey: string;
  descKey: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  features: string[];
}

export interface CheckoutParams {
  plan: Plan;
  cycle: BillingCycle;
  email: string;
  userId: string;
  isTrial: boolean;
}

export interface CheckoutResult {
  url: string;
  provider: ProviderId;
}

export interface PaymentProvider {
  id: ProviderId;
  label: string;
  available: boolean;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
}

export const PLANS: Plan[] = [
  {
    id: 'premium',
    nameKey: 'pricing.premiumName',
    descKey: 'pricing.premiumDesc',
    monthly: 4,
    yearly: 40,
    features: [
      'pricing.feature.cycle',
      'pricing.feature.pregnancy',
      'pricing.feature.health',
      'pricing.feature.journal',
      'pricing.feature.ai',
      'pricing.feature.reminders',
    ],
  },
  {
    id: 'family',
    nameKey: 'pricing.familyName',
    descKey: 'pricing.familyDesc',
    monthly: 19,
    yearly: 190,
    popular: true,
    features: [
      'pricing.feature.cycle',
      'pricing.feature.pregnancy',
      'pricing.feature.health',
      'pricing.feature.journal',
      'pricing.feature.ai',
      'pricing.feature.reminders',
      'pricing.feature.profiles',
    ],
  },
  {
    id: 'premium_plus',
    nameKey: 'pricing.premiumPlusName',
    descKey: 'pricing.premiumPlusDesc',
    monthly: 69,
    yearly: 690,
    features: [
      'pricing.feature.aiDeep',
      'pricing.feature.teleconsult',
      'pricing.feature.storage',
      'pricing.feature.export',
      'pricing.feature.support',
    ],
  },
];

export function yearlySavings(plan: Plan): number {
  return plan.monthly * 12 - plan.yearly;
}

export function planPrice(plan: Plan, cycle: BillingCycle): number {
  return cycle === 'monthly' ? plan.monthly : plan.yearly;
}

class StripeProvider implements PaymentProvider {
  id: ProviderId = 'stripe';
  label = 'Stripe';
  // Stripe is considered available when an explicit env flag is set, OR when
  // we're running against a real Supabase project (not the fallback). The edge
  // function returns a clear 503 if STRIPE_SECRET_KEY/price IDs are missing.
  available = import.meta.env.VITE_STRIPE_ENABLED === 'true';

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        plan_id: params.plan.id,
        cycle: params.cycle,
        email: params.email,
        user_id: params.userId,
        is_trial: params.isTrial,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Checkout failed (${res.status})`);
    }
    const data = await res.json();
    if (!data.url) throw new Error('No checkout URL returned');
    return { url: data.url, provider: 'stripe' };
  }
}

class FlutterwaveProvider implements PaymentProvider {
  id: ProviderId = 'flutterwave';
  label = 'Flutterwave';
  available = import.meta.env.VITE_FLUTTERWAVE_ENABLED === 'true';

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/flutterwave-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        plan_id: params.plan.id,
        cycle: params.cycle,
        email: params.email,
        user_id: params.userId,
        is_trial: params.isTrial,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Checkout failed (${res.status})`);
    }
    const data = await res.json();
    if (!data.url) throw new Error('No checkout URL returned');
    return { url: data.url, provider: 'flutterwave' };
  }
}

const providers: Record<ProviderId, PaymentProvider> = {
  stripe: new StripeProvider(),
  flutterwave: new FlutterwaveProvider(),
};

export function getProvider(id: ProviderId): PaymentProvider {
  return providers[id];
}

export function availableProviders(): PaymentProvider[] {
  return Object.values(providers);
}

export async function startCheckout(
  providerId: ProviderId,
  params: CheckoutParams,
): Promise<CheckoutResult> {
  const provider = getProvider(providerId);
  // We attempt the call even if `available` is false: the edge function will
  // return a clear 503 with guidance when secrets are missing, which is more
  // useful than a generic local rejection. This lets ops flip a PSP on just by
  // setting server-side secrets without redeploying the frontend.
  return provider.createCheckout(params);
}

// Verify a Flutterwave transaction after the browser redirect. Calls the
// flutterwave-webhook edge function, which re-verifies with FLW and activates
// the subscription. Returns whether activation succeeded.
export async function verifyFlutterwaveTransaction(
  transactionId: string,
  txRef?: string,
): Promise<{ activated: boolean; reason?: string }> {
  const params = new URLSearchParams({ transaction_id: transactionId });
  if (txRef) params.set('tx_ref', txRef);
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/flutterwave-webhook?${params.toString()}`,
    { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  const data = await res.json().catch(() => ({ activated: false, reason: 'Invalid response' }));
  return { activated: !!data.activated, reason: data.reason };
}
