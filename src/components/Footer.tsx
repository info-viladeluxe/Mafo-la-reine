import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '../i18n/I18nContext';

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const cols = [
    {
      title: t('footer.product'),
      links: [
        { label: t('nav.features'), href: '#features' },
        { label: t('nav.pricing'), href: '#pricing' },
        { label: t('nav.faq'), href: '#faq' },
      ],
    },
    {
      title: t('footer.company'),
      links: [{ label: t('nav.about'), href: '#about' }],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.terms'), href: '#' },
        { label: t('footer.privacy'), href: '#' },
        { label: t('footer.gdpr'), href: '#' },
        { label: t('footer.contact'), href: '#' },
      ],
    },
  ];

  return (
    <footer className="border-t border-aubergine-100 bg-sable-50 py-14 dark:border-white/5 dark:bg-indigo-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-aubergine-600/80 dark:text-sable-100/70">
              {t('footer.tagline')}
            </p>
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral">
                {t('footer.language')}
              </p>
              <LanguageToggle />
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-aubergine-600/80 transition-colors hover:text-aubergine-700 dark:text-sable-100/70 dark:hover:text-sable-100"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-aubergine-100 pt-6 text-xs text-neutral sm:flex-row dark:border-white/5">
          <p>© {year} LIYAH GROUP · Mafo. {t('footer.rights')}</p>
          <p>Designed for Africa.</p>
        </div>
      </div>
    </footer>
  );
}
