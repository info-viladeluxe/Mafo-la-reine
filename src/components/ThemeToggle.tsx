import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <button
      onClick={toggle}
      aria-label={t('common.toggleTheme')}
      className="btn-icon btn-icon-md border border-aubergine-200 bg-white/60 hover:bg-aubergine-50 dark:border-white/10 dark:bg-white/5 dark:text-sable-100 dark:hover:bg-white/10"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
