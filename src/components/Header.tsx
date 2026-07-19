import { useEffect, useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { useI18n } from '../i18n/I18nContext';

export function Header({ onAuth }: { onAuth: () => void }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: t('nav.features') },
    { href: '#pricing', label: t('nav.pricing') },
    { href: '#about', label: t('nav.about') },
    { href: '#faq', label: t('nav.faq') },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-sable-100/85 backdrop-blur-md shadow-soft dark:bg-indigo-400/85'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" aria-label="Mafo" className="shrink-0">
          <Logo />
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-aubergine-700 transition-colors hover:bg-aubergine-50 hover:text-rose-500 dark:text-sable-100/80 dark:hover:bg-white/5 dark:hover:text-rose-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <ThemeToggle />
          <button
            onClick={(e) => { e.preventDefault(); onAuth(); }}
            className="hidden btn-ghost text-sm sm:inline-flex"
          >
            {t('nav.signin')}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onAuth(); }}
            className="hidden btn-primary btn-shimmer text-sm sm:inline-flex"
          >
            <Sparkles size={15} />
            {t('nav.startTrial')}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-full border border-aubergine-200 bg-white/60 text-aubergine-700 transition-colors hover:border-rose-400 hover:text-rose-500 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-sable-100"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-aubergine-100 bg-sable-100/95 backdrop-blur-md dark:border-white/5 dark:bg-indigo-400/95">
          <div className="space-y-1 px-4 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-aubergine-700 transition-colors hover:bg-aubergine-50 hover:text-rose-500 dark:text-sable-100/80 dark:hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between gap-3 pt-3">
              <LanguageToggle />
              <button
                onClick={(e) => { e.preventDefault(); setOpen(false); onAuth(); }}
                className="btn-primary btn-shimmer flex-1 text-sm"
              >
                <Sparkles size={15} />
                {t('nav.startTrial')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
