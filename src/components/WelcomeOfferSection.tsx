import { useState } from 'react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface WelcomeOfferSectionProps {
  idPrefix: string;
  defaultValue?: number;
  defaultRequirement?: number;
  defaultMonths?: number;
  theme: 'dark' | 'light';
}

export function WelcomeOfferSection({
  idPrefix,
  defaultValue = 0,
  defaultRequirement = 4000,
  defaultMonths = 3,
  theme
}: WelcomeOfferSectionProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  const [showDetails, setShowDetails] = useState(true);

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800/30 dark:border-slate-750/30">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
          <input
            type="checkbox"
            id={`${idPrefix}-sub-active`}
            checked={showDetails}
            className="w-4 h-4 text-purple-600 rounded border-slate-800 focus:ring-purple-500 cursor-pointer"
            onChange={(e) => setShowDetails(e.target.checked)}
          />
          <span className="text-slate-600 dark:text-slate-400">{t('trackSUB')}</span>
        </label>
        <div className="flex items-center gap-1 text-xs font-mono shrink-0">
          <span className="text-slate-500 font-bold">$</span>
          <input
            type="number"
            id={`${idPrefix}-sub-value`}
            min="0"
            max="99999"
            defaultValue={defaultValue}
            className={`w-16 text-center text-xs font-bold rounded focus:outline-none py-0.5 border ${
              themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
            }`}
          />
        </div>
      </div>
      
      {showDetails && (
        <div id={`${idPrefix}-sub-details`} className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/30 dark:border-slate-750/30">
          <div>
            <label className="block text-[10px] font-medium mb-1 text-slate-500 dark:text-slate-450 uppercase">
              {t('spendingRequirement')}
            </label>
            <input
              type="number"
              id={`${idPrefix}-sub-requirement`}
              min="0"
              defaultValue={defaultRequirement}
              className={`w-full px-2 py-1 rounded focus:outline-none text-xs font-medium border ${
                themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
              }`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1 text-slate-500 dark:text-slate-450 uppercase">
              {t('timeLimit')}
            </label>
            <input
              type="number"
              id={`${idPrefix}-sub-months`}
              min="1"
              max="24"
              defaultValue={defaultMonths}
              className={`w-full px-2 py-1 rounded focus:outline-none text-xs font-medium border ${
                themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
