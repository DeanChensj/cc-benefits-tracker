import { Calendar, Download } from 'lucide-react';
import { downloadICSFile } from '../utils/calendar';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { ZenModal } from './ZenModal';

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

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      title={t('calSyncTitle')}
      description={t('calSyncDesc')}
      icon={<Calendar className="w-5 h-5" />}
      maxWidthClass="max-w-md"
    >
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
          className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
            themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
          }`}
        >
          {t('cancel')}
        </button>
    </ZenModal>
  );
}
