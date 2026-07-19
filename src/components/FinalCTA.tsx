import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function FinalCTA({ onAuth }: { onAuth: () => void }) {
  const { t } = useI18n();

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-aubergine-600 via-aubergine-700 to-indigo-400 p-10 text-center text-white sm:p-16">
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-ocre-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emeraude-500/20 blur-3xl" />

            <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
              {t('final.title')}
            </h2>
            <p className="relative mt-4 text-white/80">{t('final.subtitle')}</p>
            <a
              href="#pricing"
              onClick={(e) => { e.preventDefault(); onAuth(); }}
              className="btn-shimmer relative mt-8 inline-flex btn bg-ocre-400 px-8 py-3.5 text-base text-aubergine-900 hover:bg-ocre-500 hover:text-white"
            >
              {t('final.cta')}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
