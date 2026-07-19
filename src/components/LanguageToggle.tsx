import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../i18n/translations';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ['fr', 'en'];

  return (
    <div
      className="inline-flex items-center rounded-full border border-aubergine-200 bg-white/60 p-0.5 text-sm dark:border-white/10 dark:bg-white/5"
      role="group"
      aria-label="Language"
    >
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-3 py-1 rounded-full font-medium uppercase transition-all ${
            lang === l
              ? 'bg-aubergine-600 text-white shadow-soft'
              : 'text-aubergine-600 hover:text-aubergine-800 dark:text-sable-100/70 dark:hover:text-sable-100'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
