import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';
import { PLANS, planPrice, yearlySavings, type BillingCycle } from '../lib/payments';

export function Pricing({ onAuth }: { onAuth: () => void }) {
  const { t } = useI18n();
  const [cycle, setCycle] = useState<BillingCycle>('yearly');

  return (
    <section id="pricing" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
            {t('pricing.title')}
          </h2>
          <p className="mt-3 text-neutral">{t('pricing.subtitle')}</p>
        </Reveal>

        {/* Billing toggle */}
        <Reveal className="mt-8 flex items-center justify-center">
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
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = planPrice(plan, cycle);
            const unit = cycle === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear');
            const saving = yearlySavings(plan);
            return (
              <Reveal key={plan.id} delay={i * 100}>
                <div
                  className={`relative flex h-full flex-col rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 ${
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

                  <div className="mt-8 pt-2">
                    <a
                      href="#signup"
                      onClick={(e) => { e.preventDefault(); onAuth(); }}
                      className={`btn-shimmer btn w-full py-3 text-sm ${
                        plan.popular
                          ? 'bg-ocre-400 text-aubergine-900 hover:bg-ocre-500 hover:text-white'
                          : 'btn-primary'
                      }`}
                    >
                      {t('pricing.ctaTrial')}
                    </a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-neutral">{t('pricing.footnote')}</p>
      </div>
    </section>
  );
}
