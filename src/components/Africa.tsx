import { CreditCard, Languages, Globe2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function Africa() {
  const { t } = useI18n();

  const items = [
    { icon: CreditCard, title: t('africa.payments'), desc: t('africa.paymentsDesc') },
    { icon: Languages, title: t('africa.languages'), desc: t('africa.languagesDesc') },
    { icon: Globe2, title: t('africa.countries'), desc: t('africa.countriesDesc') },
  ];

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-aubergine-600 to-aubergine-700 p-8 text-white sm:p-12 lg:p-16">
          <Reveal className="max-w-2xl">
            <span className="chip bg-white/10 text-ocre-200">
              <span className="h-1.5 w-1.5 rounded-full bg-ocre-400" />
              Afrique
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {t('africa.title')}
            </h2>
            <p className="mt-3 text-white/80">{t('africa.subtitle')}</p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {items.map((it, i) => (
              <Reveal key={it.title} delay={i * 100}>
                <div className="rounded-2xl bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-ocre-400/20 text-ocre-200">
                    <it.icon size={20} />
                  </div>
                  <h3 className="mt-4 font-semibold">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{it.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
