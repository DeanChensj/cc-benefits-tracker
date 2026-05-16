import { Sparkles, CreditCard, Zap, Plus, Search } from 'lucide-react';
import { translations } from '../utils/i18n';
import { useCardStore } from '../store/useCardStore';
import { CARDS_DB } from '../data/cards.db';

interface EmptyWalletStateProps {
  onManualAdd?: () => void;
  onBrowse?: () => void;
  onImportComplete?: () => void;
  themeClass: (dark: string, light: string) => string;
}

export function EmptyWalletState({ onManualAdd, onBrowse, onImportComplete, themeClass }: EmptyWalletStateProps) {
  const addCardsBatch = useCardStore((state) => state.addCardsBatch);
  const language = useCardStore((state) => state.language);
  const injectDemoData = useCardStore((state) => state.injectDemoData);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const combos = [
    {
      id: 'chase-trifecta',
      name: t('chaseTrifecta'),
      desc: t('chaseTrifectaDesc'),
      cards: ['chase-sapphire-reserve', 'chase-freedom-flex', 'chase-freedom-unlimited'],
      color: 'from-blue-600 to-indigo-800'
    },
    {
      id: 'amex-trifecta',
      name: t('amexTrifecta'),
      desc: t('amexTrifectaDesc'),
      cards: ['amex-platinum', 'amex-gold', 'amex-bbp'],
      color: 'from-amber-600 to-orange-600'
    },
    {
      id: 'hotel-boss',
      name: t('hotelBoss'),
      desc: t('hotelBossDesc'),
      cards: ['amex-platinum', 'amex-hilton-aspire', 'chase-marriott-boundless'],
      color: 'from-purple-600 to-indigo-900'
    }
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-2 sm:py-8 px-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className={`text-xl font-black mt-4 ${themeClass('text-white', 'text-slate-900')}`}>
          {t('startWallet')}
        </h3>
        <p className={`text-xs max-w-md mx-auto leading-relaxed ${themeClass('text-slate-400', 'text-slate-500')}`}>
          {t('startWalletDesc')}
        </p>
        <div className="pt-3">
          <button
            onClick={injectDemoData}
            className="relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-bold text-white rounded-2xl group bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/30 transition-all duration-300 active:scale-95 cursor-pointer text-xs"
          >
            <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-white opacity-10 group-hover:w-full group-hover:h-32"></span>
            <Zap className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
            <span>{t('enterDemoModeNow')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {combos.map((combo) => (
          <div 
            key={combo.id}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
              themeClass('bg-slate-900/40 border-slate-850 hover:border-purple-500/50', 'bg-white border-slate-200 hover:border-purple-500/50 shadow-sm')
            }`}
            onClick={() => {
              addCardsBatch(combo.cards);
              onImportComplete?.();
            }}
          >
            <div>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${combo.color} flex items-center justify-center text-white mb-3`}>
                <CreditCard className="w-4 h-4" />
              </div>
              <h4 className={`text-xs font-bold ${themeClass('text-white', 'text-slate-900')}`}>{combo.name}</h4>
              <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-455', 'text-slate-500')}`}>
                {combo.desc}
              </p>
              <p className={`text-[9px] mt-1.5 font-medium leading-tight ${themeClass('text-slate-500', 'text-slate-450')}`}>
                <span className="font-bold">{t('includesCards')}</span>
                {combo.cards.map(id => {
                  const template = CARDS_DB.find(c => c.id === id);
                  return template ? template.name : id;
                }).join(', ')}
              </p>
            </div>
            <button className="mt-4 text-[10px] font-bold text-purple-500 hover:text-purple-400 flex items-center gap-1 cursor-pointer">
              <Zap className="w-3 h-3" />
              {t('oneClickImport')}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 flex flex-wrap justify-center gap-3">
        {onManualAdd && (
          <button
            onClick={onManualAdd}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl border transition duration-200 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
              themeClass(
                'bg-slate-900/50 hover:bg-slate-850/50 border-slate-800 text-slate-300 hover:text-white shadow-inner',
                'bg-white/80 hover:bg-white border-slate-250 text-slate-700 hover:text-slate-900 shadow-sm'
              )
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('addCardManually')}
          </button>
        )}
        {onBrowse && (
          <button
            onClick={onBrowse}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl border transition duration-200 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
              themeClass(
                'bg-slate-900/50 hover:bg-slate-850/50 border-slate-800 text-slate-300 hover:text-white shadow-inner',
                'bg-white/80 hover:bg-white border-slate-250 text-slate-700 hover:text-slate-900 shadow-sm'
              )
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            {t('browseTemplates')}
          </button>
        )}
      </div>
    </div>
  );
}
