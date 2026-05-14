import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

export function useTranslation() {
  const language = useCardStore((state) => state.language);
  const theme = useCardStore((state) => state.theme);
  
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  
  return { t, language, themeClass, theme };
}
