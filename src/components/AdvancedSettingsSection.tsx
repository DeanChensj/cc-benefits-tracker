import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { DEFAULT_VALUATIONS } from '../data/cards.db';

interface AdvancedSettingsSectionProps {
  themeClass: (dark: string, light: string) => string;
  onWipe: () => void;
}

export function AdvancedSettingsSection({ themeClass, onWipe }: AdvancedSettingsSectionProps) {
  const { language, pointValuations, updatePointValuation } = useCardStore();
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];
  
  const [isAdvancedOfflineOpen, setIsAdvancedOfflineOpen] = useState(false);

  return (
    <div className="pt-4 mt-6 border-t border-dashed border-slate-200 dark:border-slate-800/60 text-left">
      <button
        type="button"
        onClick={() => setIsAdvancedOfflineOpen(!isAdvancedOfflineOpen)}
        className={`text-[9.5px] font-extrabold uppercase tracking-widest flex items-center justify-between w-full transition cursor-pointer ${
          themeClass('text-slate-400 hover:text-slate-300', 'text-slate-505 hover:text-slate-800')
        }`}
      >
        <span>{language === 'zh' ? '⚙️ 高级本地配置' : '⚙️ Advanced Offline Settings'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 transform ${isAdvancedOfflineOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>

      <div className={`transition-all duration-350 overflow-hidden ${isAdvancedOfflineOpen ? 'max-h-[550px] opacity-100 mt-3.5' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className={`p-4 rounded-2xl border text-left space-y-4 ${
          themeClass('bg-slate-955/40 border-slate-850 text-slate-400', 'bg-slate-50 border-slate-200 text-slate-600')
        }`}>
          {/* 🎯 Points Valuations Editor inside Advanced Settings Accordion */}
          <div className="space-y-2">
            <p className={`text-[9.5px] font-extrabold uppercase tracking-widest ${themeClass('text-purple-400', 'text-purple-650')}`}>
              {t('valEditorTitle')}
            </p>
            <p className="text-[10px] leading-normal opacity-85 font-medium">
              {t('valEditorDesc')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {Object.entries(pointValuations || DEFAULT_VALUATIONS)
                .filter(([currency]) => currency !== 'cash')
                .map(([currency, cpp]) => (
                <div key={currency} className={`px-2 py-1 rounded-lg border flex items-center justify-between gap-1.5 ${
                  themeClass('bg-slate-900/40 border-slate-850', 'bg-slate-50 border-slate-200')
                }`}>
                  <label className="text-[8.5px] font-black uppercase tracking-wider truncate">{currency.replace('-', ' ')}</label>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={cpp}
                      onChange={(e) => updatePointValuation(currency, Math.max(0, Number(e.target.value)))}
                      className={`w-10 border text-center text-[10px] font-mono font-black rounded-md py-0.5 focus:outline-none transition ${
                        themeClass('bg-slate-955 border-slate-800 text-white focus:border-purple-500', 'bg-white border-slate-250 text-slate-900 focus:border-purple-500 shadow-inner')
                      }`}
                    />
                    <span className="text-[8px] opacity-50 font-bold">cpp</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-dashed border-slate-200/30 dark:border-slate-800/40 flex items-center justify-between gap-3">
            <p className="text-[9px] opacity-75 leading-normal max-w-xs font-medium">
              {t('dangerZoneDesc')}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsAdvancedOfflineOpen(false);
                onWipe();
              }}
              className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 font-extrabold py-2 px-4 rounded-xl text-[10px] transition active:scale-95 cursor-pointer text-center shrink-0"
            >
              {t('wipeAllDataBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
