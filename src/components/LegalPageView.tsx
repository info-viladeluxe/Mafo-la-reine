import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

export type LegalPage = 'terms' | 'privacy' | 'gdpr' | 'contact' | 'about';

export function LegalPageView({ page, onBack }: { page: LegalPage; onBack: () => void }) {
  const { t } = useI18n();

  const sections: Record<LegalPage, { title: string; body: string[] }[]> = {
    terms: [
      { title: t('legal.terms.s1Title'), body: [t('legal.terms.s1Body')] },
      { title: t('legal.terms.s2Title'), body: [t('legal.terms.s2Body')] },
      { title: t('legal.terms.s3Title'), body: [t('legal.terms.s3Body')] },
      { title: t('legal.terms.s4Title'), body: [t('legal.terms.s4Body')] },
      { title: t('legal.terms.s5Title'), body: [t('legal.terms.s5Body')] },
    ],
    privacy: [
      { title: t('legal.privacy.s1Title'), body: [t('legal.privacy.s1Body')] },
      { title: t('legal.privacy.s2Title'), body: [t('legal.privacy.s2Body')] },
      { title: t('legal.privacy.s3Title'), body: [t('legal.privacy.s3Body')] },
      { title: t('legal.privacy.s4Title'), body: [t('legal.privacy.s4Body')] },
    ],
    gdpr: [
      { title: t('legal.gdpr.s1Title'), body: [t('legal.gdpr.s1Body')] },
      { title: t('legal.gdpr.s2Title'), body: [t('legal.gdpr.s2Body')] },
      { title: t('legal.gdpr.s3Title'), body: [t('legal.gdpr.s3Body')] },
      { title: t('legal.gdpr.s4Title'), body: [t('legal.gdpr.s4Body')] },
    ],
    contact: [
      { title: t('legal.contact.s1Title'), body: [t('legal.contact.s1Body')] },
      { title: t('legal.contact.s2Title'), body: [t('legal.contact.s2Body')] },
    ],
    about: [
      { title: t('legal.about.s1Title'), body: [t('legal.about.s1Body')] },
      { title: t('legal.about.s2Title'), body: [t('legal.about.s2Body')] },
      { title: t('legal.about.s3Title'), body: [t('legal.about.s3Body')] },
    ],
  };

  const pageTitle = t(`legal.${page}.title` as never);

  return (
    <div className="min-h-screen bg-sable-100 dark:bg-indigo-400">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-aubergine-100 bg-sable-100/85 px-4 py-3 backdrop-blur-md dark:border-white/5 dark:bg-indigo-400/85">
        <button onClick={onBack} className="btn-ghost text-sm"><ArrowLeft size={16} /> {t('legal.back')}</button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo className="justify-center" />
          <h1 className="text-3xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{pageTitle}</h1>
          <p className="text-sm text-neutral">{t('legal.lastUpdated')}: {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="card space-y-8 p-8 sm:p-10">
          {sections[page].map((sec, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-aubergine-700 dark:text-sable-100">{sec.title}</h2>
              {sec.body.map((p, j) => (
                <p key={j} className="mt-2 text-sm leading-relaxed text-aubergine-600/90 dark:text-sable-100/80">{p}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button onClick={onBack} className="btn-outline px-6 py-3 text-sm">{t('legal.backToApp')}</button>
        </div>
      </div>
    </div>
  );
}
