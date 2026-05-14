import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

export function Footer() {
  const { theme, language } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  return (
    <footer className="mt-auto pt-8 pb-24 sm:pb-8 px-4 text-center space-y-3 shrink-0">
      {/* Trust Badges for Local-First reassurance */}
      <div className="flex flex-wrap justify-center items-center gap-2 max-w-2xl mx-auto">
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm ${
          themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400', 'bg-slate-100/80 border-slate-200 text-slate-600')
        }`}>
          <span>{t('footerLocalData')}</span>
        </div>
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm ${
          themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400', 'bg-slate-100/80 border-slate-200 text-slate-600')
        }`}>
          <span>{t('footerNoPlaid')}</span>
        </div>
        <a
          href="https://github.com/DeanChensj/cc-benefits-tracker"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm transition hover:scale-[1.02] cursor-pointer ${
            themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400 hover:text-purple-400 hover:border-purple-900/30', 'bg-slate-100/80 border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-300')
          }`}
        >
          <span>{t('footerGithub')}</span>
        </a>
      </div>

      <p className={`text-[9px] font-bold tracking-wider uppercase ${themeClass('text-slate-500/80', 'text-slate-455')}`}>
        {t('footerPassion')}
      </p>

      <p className="text-[8.5px] leading-relaxed max-w-md mx-auto opacity-70 text-slate-500 dark:text-slate-450 font-medium">
        {t('footerPruneDesc')}
      </p>
    </footer>
  );
}
