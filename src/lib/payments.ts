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
  available = false;

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
  available = false;

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flutterwave-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
  if (!provider.available) {
    throw new Error(`${provider.label} is not configured yet.`);
  }
  return provider.createCheckout(params);
}
