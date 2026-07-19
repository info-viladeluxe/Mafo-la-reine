import { Quote } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function Testimonials() {
  const { t } = useI18n();

  const items = [
    { quote: t('testimonials.t1'), name: t('testimonials.t1Name'), initials: 'A', accent: 'cycle' },
    { quote: t('testimonials.t2'), name: t('testimonials.t2Name'), initials: 'M', accent: 'emeraude' },
    { quote: t('testimonials.t3'), name: t('testimonials.t3Name'), initials: 'N', accent: 'ocre' },
  ];

  const avatarMap: Record<string, string> = {
    cycle: 'bg-cycle/15 text-cycle',
    emeraude: 'bg-emeraude-100 text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200',
    ocre: 'bg-ocre-100 text-ocre-700 dark:bg-ocre-400/15 dark:text-ocre-200',
  };

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
            {t('testimonials.title')}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.name} delay={i * 100}>
              <figure className="card h-full p-6">
                <Quote size={22} className="text-ocre-400" />
                <blockquote className="mt-4 text-sm leading-relaxed text-aubergine-700 dark:text-sable-100/85">
                  {it.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${avatarMap[it.accent]}`}>
                    {it.initials}
                  </span>
                  <span className="text-sm font-medium text-aubergine-700 dark:text-sable-100">
                    {it.name}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
