import { Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function Trust() {
  const { t } = useI18n();

  const items = [
    { icon: Lock, title: t('trust.item1Title'), desc: t('trust.item1Desc') },
    { icon: KeyRound, title: t('trust.item2Title'), desc: t('trust.item2Desc') },
    { icon: ShieldCheck, title: t('trust.item3Title'), desc: t('trust.item3Desc') },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
            {t('trust.title')}
          </h2>
          <p className="mt-3 text-neutral">{t('trust.subtitle')}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 100}>
              <div className="card h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200">
                  <it.icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-aubergine-700 dark:text-sable-100">
                  {it.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-aubergine-600/80 dark:text-sable-100/70">
                  {it.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
