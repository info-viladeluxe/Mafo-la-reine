import { HeartPulse, Baby, Sparkles, FolderLock, Pill } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function Features() {
  const { t } = useI18n();

  const features = [
    { icon: HeartPulse, title: t('features.f1Title'), desc: t('features.f1Desc'), accent: 'cycle' },
    { icon: Baby, title: t('features.f2Title'), desc: t('features.f2Desc'), accent: 'ocre' },
    { icon: Sparkles, title: t('features.f3Title'), desc: t('features.f3Desc'), accent: 'emeraude' },
    { icon: FolderLock, title: t('features.f4Title'), desc: t('features.f4Desc'), accent: 'terre' },
    { icon: Pill, title: t('features.f5Title'), desc: t('features.f5Desc'), accent: 'aubergine' },
  ];

  const accentMap: Record<string, string> = {
    cycle: 'bg-cycle/10 text-cycle dark:bg-cycle/20',
    ocre: 'bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
    emeraude: 'bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200',
    terre: 'bg-terre-50 text-terre-500 dark:bg-terre-500/15 dark:text-terre-200',
    aubergine: 'bg-aubergine-50 text-aubergine-600 dark:bg-aubergine-700/20 dark:text-aubergine-200',
  };

  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
            {t('features.title')}
          </h2>
          <p className="mt-3 text-neutral">{t('features.subtitle')}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="card group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${accentMap[f.accent]} transition-transform duration-300 group-hover:scale-110`}>
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-aubergine-700 dark:text-sable-100">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-aubergine-600/80 dark:text-sable-100/70">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
          {/* Filler card — AI disclaimer reminder */}
          <Reveal delay={200}>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-aubergine-200 p-6 text-center dark:border-white/10">
              <p className="text-sm font-medium text-aubergine-600 dark:text-sable-100/70">
                {t('features.f3Desc')}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
