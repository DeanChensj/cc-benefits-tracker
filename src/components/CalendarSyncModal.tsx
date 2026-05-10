import { Calendar, Download } from 'lucide-react';
import { downloadICSFile } from '../utils/calendar';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

import type { LogEntry } from '../utils/logUtils';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCards: OwnedCardInstance[];
  logs: Record<string, LogEntry>;
  loyaltyAwards?: LoyaltyAward[];
  theme: 'dark' | 'light';
}

export function CalendarSyncModal({ isOpen, onClose, ownedCards, logs, loyaltyAwards, theme }: CalendarSyncModalProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  if (!isOpen) return null;

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <div className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up transition-colors duration-300 ${
          themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${themeClass('text-white', 'text-slate-900')}`}>{t('calSyncTitle')}</h3>
          </div>
        </div>

        <p className={`text-xs leading-relaxed mb-5 ${themeClass('text-slate-300', 'text-slate-650')}`}>
          {t('calSyncDesc')}
        </p>

        <button
          onClick={() => {
            downloadICSFile(ownedCards, logs, loyaltyAwards);
          }}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition active:scale-[0.98] shadow-lg shadow-amber-500/10 mb-6 cursor-pointer"
        >
          <Download className="w-4 h-4 stroke-[3]" />
          {t('calSyncBtn')}
        </button>

        <div className={`space-y-4 border-t pt-4 ${themeClass('border-slate-800', 'border-slate-200')}`}>
          {/* Smart Exporter Reassurance Card */}
          <div className={`p-3 rounded-xl border space-y-2 text-left ${
            themeClass('bg-slate-955/40 border-slate-850 text-slate-400', 'bg-slate-50 border-slate-200 text-slate-600')
          }`}>
            <p className={`text-[10px] font-extrabold flex items-center gap-1 ${themeClass('text-purple-400', 'text-purple-600')}`}>
              {t('calFilterTitle')}
            </p>
            <p className="text-[9px] leading-normal">
              {t('calFilterDesc')}
            </p>
          </div>

          <h4 className={`text-[10px] font-bold uppercase tracking-wider ${themeClass('text-slate-500', 'text-slate-400')}`}>{t('calSystemHeader')}</h4>
          
          <div className="space-y-2.5">
            <div className="text-xs">
              <p className={`font-semibold ${themeClass('text-slate-200', 'text-slate-800')}`}>{t('calSystemiOS')}</p>
              <p className={`mt-0.5 text-[11px] ${themeClass('text-slate-400', 'text-slate-500')}`}>{t('calSystemiOSDesc')}</p>
            </div>

            <div className="text-xs">
              <p className={`font-semibold ${themeClass('text-slate-200', 'text-slate-800')}`}>{t('calSystemGoogle')}</p>
              <p className={`mt-0.5 text-[11px] ${themeClass('text-slate-400', 'text-slate-555')}`}>
                {t('calSystemGoogleDesc')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-6 font-semibold py-2 rounded-lg text-xs transition cursor-pointer ${
            themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
          }`}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
