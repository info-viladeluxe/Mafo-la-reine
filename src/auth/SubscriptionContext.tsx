import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type SubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
export type PlanId = 'premium' | 'family' | 'premium_plus';
export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  cycle: BillingCycle;
  provider: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
}

interface SubContextValue {
  subscription: Subscription | null;
  loading: boolean;
  hasAccess: boolean;
  daysLeftInTrial: number | null;
  startTrial: (planId: PlanId, cycle: BillingCycle) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const SubContext = createContext<SubContextValue | null>(null);

const TRIAL_DAYS = 3;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .maybeSingle();
    if (error) {
      console.error('subscription load error', error);
      return;
    }
    setSubscription(data as Subscription | null);
  };

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    load(user.id).finally(() => setLoading(false));
  }, [user]);

  const now = new Date();
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  const hasAccess =
    subscription !== null &&
    (subscription.status === 'active'
      ? !periodEnd || periodEnd > now
      : subscription.status === 'trialing'
        ? !trialEnd || trialEnd > now
        : false);

  const daysLeftInTrial =
    subscription?.status === 'trialing' && trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
      : null;

  const startTrial = async (planId: PlanId, cycle: BillingCycle) => {
    if (!user) return { error: 'No session' };
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        cycle,
        status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select('*')
      .maybeSingle();

    if (error) return { error: error.message };
    if (data) setSubscription(data as Subscription);
    return { error: null };
  };

  const refresh = async () => {
    if (user) await load(user.id);
  };

  return (
    <SubContext.Provider value={{ subscription, loading, hasAccess, daysLeftInTrial, startTrial, refresh }}>
      {children}
    </SubContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
