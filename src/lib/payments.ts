import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export type BillingCycle = 'monthly' | 'yearly';
export type PlanId = 'premium' | 'family' | 'premium_plus';
export type ProviderId = 'stripe' | 'flutterwave' | 'payunit' | 'paystack';

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

class PayUnitProvider implements PaymentProvider {
  id: ProviderId = 'payunit';
  label = 'PayUnit';
  available = import.meta.env.VITE_PAYUNIT_ENABLED === 'true';

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/payunit-checkout`, {
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
    return { url: data.url, provider: 'payunit' };
  }
}

// Paystack — wired up (paystack-checkout / paystack-webhook edge functions
// exist). `available` still gates on VITE_PAYSTACK_ENABLED so it only shows
// once PAYSTACK_SECRET_KEY is set server-side.
class PaystackProvider implements PaymentProvider {
  id: ProviderId = 'paystack';
  label = 'Paystack';
  available = import.meta.env.VITE_PAYSTACK_ENABLED === 'true';

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-checkout`, {
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
    return { url: data.url, provider: 'paystack' };
  }
}

const providers: Record<ProviderId, PaymentProvider> = {
  stripe: new StripeProvider(),
  flutterwave: new FlutterwaveProvider(),
  payunit: new PayUnitProvider(),
  paystack: new PaystackProvider(),
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

// Verify a PayUnit transaction after the browser redirect. Calls the
// payunit-webhook edge function, which re-verifies with PayUnit and
// activates the subscription. Returns whether activation succeeded.
export async function verifyPayunitTransaction(
  transactionId: string,
): Promise<{ activated: boolean; reason?: string }> {
  const params = new URLSearchParams({ transaction_id: transactionId });
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/payunit-webhook?${params.toString()}`,
    { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  const data = await res.json().catch(() => ({ activated: false, reason: 'Invalid response' }));
  return { activated: !!data.activated, reason: data.reason };
}

// Verify a Paystack transaction after the browser redirect.
export async function verifyPaystackTransaction(
  reference: string,
): Promise<{ activated: boolean; reason?: string }> {
  const params = new URLSearchParams({ reference });
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/paystack-webhook?${params.toString()}`,
    { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  const data = await res.json().catch(() => ({ activated: false, reason: 'Invalid response' }));
  return { activated: !!data.activated, reason: data.reason };
}

// Display-only USD -> target currency conversion (live rate, ECB via
// frankfurter.app, same source used server-side for PayUnit). This never
// changes what a user is actually charged — checkout always runs in USD
// (or whatever the chosen PSP settles in, converted server-side). This is
// purely so a user whose profile.currency isn't USD sees an approximate
// "≈ 2 400 XAF" next to the authoritative "$4" price.
const fxCache = new Map<string, { rate: number; at: number }>();
const FX_CACHE_MS = 60 * 60 * 1000; // 1h

export async function convertFromUSD(amountUsd: number, targetCurrency: string): Promise<number | null> {
  if (targetCurrency === 'USD') return amountUsd;
  const cached = fxCache.get(targetCurrency);
  if (cached && Date.now() - cached.at < FX_CACHE_MS) {
    return Math.round(amountUsd * cached.rate * 100) / 100;
  }
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(targetCurrency)}`);
    const data = await res.json();
    const rate = data?.rates?.[targetCurrency];
    if (!rate) return null;
    fxCache.set(targetCurrency, { rate, at: Date.now() });
    return Math.round(amountUsd * rate * 100) / 100;
  } catch {
    return null;
  }
}
