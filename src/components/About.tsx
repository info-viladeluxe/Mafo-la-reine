import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function About() {
  const { t } = useI18n();

  return (
    <section id="about" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-ocre-100/50 to-aubergine-100/40 blur-2xl dark:from-ocre-400/10 dark:to-aubergine-700/20" />
              <div className="card flex aspect-square items-center justify-center overflow-hidden rounded-3xl">
                <div className="relative grid h-48 w-48 place-items-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-aubergine-600 to-ocre-400 opacity-90" />
                  <div className="absolute inset-3 rounded-full border border-ocre-200/40" />
                  <div className="absolute inset-6 rounded-full border border-ocre-200/30" />
                  <span className="relative text-5xl font-bold text-white">M</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <span className="chip border border-ocre-200 bg-ocre-50 text-ocre-700 dark:border-ocre-400/30 dark:bg-ocre-400/10 dark:text-ocre-200">
              LIYAH GROUP
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
              {t('about.title')}
            </h2>
            <p className="mt-5 leading-relaxed text-aubergine-600/90 dark:text-sable-100/80">
              {t('about.body1')}
            </p>
            <p className="mt-4 leading-relaxed text-aubergine-600/90 dark:text-sable-100/80">
              {t('about.body2')}
            </p>
            <p className="mt-6 text-sm font-medium text-ocre-600">{t('about.editor')}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
