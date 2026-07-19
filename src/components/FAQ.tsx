import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Reveal } from './Reveal';

export function FAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ];

  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-aubergine-700 sm:text-3xl dark:text-sable-100">
            {t('faq.title')}
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 50}>
                <div className="card overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium text-aubergine-700 dark:text-sable-100">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-ocre-500 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-aubergine-600/85 dark:text-sable-100/75">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
