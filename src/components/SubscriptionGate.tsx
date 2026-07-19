import { useState } from 'react';
import { Lock, Sparkles, Check, Loader2, CreditCard, Zap } from 'lucide-react';
import { useSubscription, type PlanId, type BillingCycle } from '../auth/SubscriptionContext';
import { useI18n } from '../i18n/I18nContext';
import { PLANS, planPrice, yearlySavings, startCheckout, availableProviders } from '../lib/payments';
import { useAuth } from '../auth/AuthContext';

export function SubscriptionGate() {
  const { t } = useI18n();
  const { subscription, daysLeftInTrial, startTrial } = useSubscription();
  const { user } = useAuth();
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trialEnded = subscription && subscription.status === 'trialing' && (daysLeftInTrial ?? 0) <= 0;
  const noSub = !subscription;

  const handleStart = async (planId: PlanId) => {
    setError(null);
    setBusy(planId);
    try {
      const plan = PLANS.find((p) => p.id === planId)!;
      const providers = availableProviders().filter((p) => p.available);
      if (providers.length > 0 && user) {
        const result = await startCheckout(providers[0].id, {
          plan,
          cycle,
          email: user.email ?? '',
          userId: user.id,
          isTrial: true,
        });
        window.location.href = result.url;
        return;
      }
      // No payment provider configured yet — start a local trial.
      await startTrial(planId, cycle);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-sable-100 dark:bg-indigo-400">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-ocre-100/50 via-aubergine-50 to-emeraude-50/30 blur-3xl dark:from-ocre-400/10 dark:via-aubergine-700/20" />

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-aubergine-600 text-white shadow-soft-lg">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
            {trialEnded ? t('gate.trialEnded') : t('gate.welcome')}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-neutral">
            {trialEnded ? t('gate.trialEndedDesc') : t('gate.welcomeDesc')}
          </p>
          {daysLeftInTrial !== null && daysLeftInTrial > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emeraude-50 px-4 py-2 text-sm font-medium text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200">
              <Sparkles size={16} />
              {t('gate.daysLeft', { n: daysLeftInTrial })}
            </div>
          )}
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full border border-aubergine-200 bg-white/60 p-1 dark:border-white/10 dark:bg-white/5">
            {(['monthly', 'yearly'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  cycle === c
                    ? 'bg-aubergine-600 text-white shadow-soft'
                    : 'text-aubergine-600 hover:text-aubergine-800 dark:text-sable-100/70 dark:hover:text-sable-100'
                }`}
              >
                {c === 'yearly' && cycle === c && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ocre-400 px-2 py-0.5 text-[10px] font-semibold text-aubergine-900 shadow-soft">
                    {t('pricing.saveBadge')}
                  </span>
                )}
                {c === 'monthly' ? t('pricing.monthly') : t('pricing.yearly')}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-md animate-fade-in rounded-xl bg-terre-50 px-4 py-3 text-center text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">
            {error}
          </div>
        )}

        {/* Plans */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const unit = cycle === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear');
            const saving = yearlySavings(plan);
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? 'bg-aubergine-600 text-white shadow-soft-lg ring-2 ring-ocre-400'
                    : 'card'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-ocre-400 px-3 py-1 text-xs font-semibold text-aubergine-900 shadow-soft">
                    <Zap size={12} className="fill-current" />
                    {t('pricing.popular')}
                  </span>
                )}

                <h3 className={`text-lg font-semibold ${plan.popular ? 'text-white' : 'text-aubergine-700 dark:text-sable-100'}`}>
                  {t(plan.nameKey as never)}
                </h3>
                <p className={`mt-1 text-sm ${plan.popular ? 'text-white/80' : 'text-neutral'}`}>
                  {t(plan.descKey as never)}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`tnum text-4xl font-bold ${plan.popular ? 'text-white' : 'text-aubergine-700 dark:text-sable-100'}`}>
                    ${price}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-neutral'}`}>{unit}</span>
                </div>
                {cycle === 'yearly' && saving > 0 && (
                  <p className={`mt-1 text-xs font-medium ${plan.popular ? 'text-ocre-200' : 'text-emeraude-600'}`}>
                    {t('gate.save', { n: saving })}
                  </p>
                )}
                <p className={`mt-1 text-xs font-medium ${plan.popular ? 'text-ocre-200' : 'text-emeraude-600'}`}>
                  {t('pricing.trial')}
                </p>

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${plan.popular ? 'bg-white/15 text-ocre-200' : 'bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200'}`}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className={plan.popular ? 'text-white/90' : 'text-aubergine-700 dark:text-sable-100/85'}>
                        {t(f as never)}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStart(plan.id)}
                  disabled={busy !== null}
                  className={`btn-shimmer mt-7 w-full py-3 text-sm ${
                    plan.popular
                      ? 'bg-ocre-400 text-aubergine-900 hover:bg-ocre-500 hover:text-white'
                      : 'btn-primary'
                  }`}
                >
                  {busy === plan.id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  {t('pricing.ctaTrial')}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-neutral">{t('pricing.footnote')}</p>
      </div>
    </div>
  );
}
