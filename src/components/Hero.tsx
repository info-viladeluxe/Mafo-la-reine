import { ShieldCheck, KeyRound, Lock } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';
import { HeroMockup } from './HeroMockup';

export function Hero({ onAuth }: { onAuth: () => void }) {
  const { t } = useI18n();

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-40 lg:pb-28">
      {/* Background wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-ocre-100/60 via-aubergine-50 to-emeraude-50/40 blur-3xl dark:from-ocre-400/10 dark:via-aubergine-700/20 dark:to-emeraude-700/10" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="animate-fade-up">
          <span className="chip border border-ocre-200 bg-ocre-50 text-ocre-700 dark:border-ocre-400/30 dark:bg-ocre-400/10 dark:text-ocre-200">
            <span className="h-1.5 w-1.5 rounded-full bg-ocre-400" />
            {t('hero.badge')}
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-aubergine-700 sm:text-5xl lg:text-6xl dark:text-sable-100">
            {t('hero.title')}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-aubergine-600/90 dark:text-sable-100/80">
            {t('hero.subtitle')}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#pricing" onClick={(e) => { e.preventDefault(); onAuth(); }} className="btn-shimmer btn-primary btn-lg">
              {t('hero.cta')}
            </a>
            <p className="text-sm text-neutral">{t('hero.ctaNote')}</p>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { icon: ShieldCheck, label: t('hero.stat3') },
              { icon: KeyRound, label: t('hero.stat2') },
              { icon: Lock, label: t('hero.stat1') },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm font-medium text-aubergine-600 dark:text-sable-100/70">
                <Icon size={16} className="text-ocre-500" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <Reveal delay={150} className="animate-fade-in">
          <HeroMockup />
        </Reveal>
      </div>
    </section>
  );
}
