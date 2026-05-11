import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';
import { Zap } from 'lucide-react';

interface BestCard {
  cardName: string;
  multiplier: number;
  ros: number;
  currency: string;
  bank: string;
}

interface CheckoutWinnersRowProps {
  checkoutWinners: Record<string, BestCard | null> | null;
  activeTab: string;
  deckSubTab: 'cards' | 'awards' | 'templates';
}

export function CheckoutWinnersRow({ checkoutWinners, activeTab, deckSubTab }: CheckoutWinnersRowProps) {
  const language = useCardStore((state) => state.language);
  const theme = useCardStore((state) => state.theme);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];
  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  if (activeTab !== 'cards' || deckSubTab !== 'cards' || !checkoutWinners) return null;

  const getCategoryDotColor = (cat: string) => {
    if (cat === 'dining') return 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.6)]';
    if (cat === 'travel') return 'bg-sky-500 shadow-[0_0_5px_rgba(14,165,233,0.6)]';
    if (cat === 'shopping') return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]';
    if (cat === 'entertainment') return 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.6)]';
    return 'bg-slate-500';
  };

  return (
    <div className={`flex items-center gap-3 overflow-x-auto px-2 py-1.5 mb-3 no-scrollbar shrink-0 text-[8px] font-black uppercase tracking-widest select-none w-full border rounded-xl ${
      themeClass('bg-slate-950 border-slate-800 text-slate-400', 'bg-white border-slate-200 text-slate-550 shadow-sm')
    }`}>
      {/* Prefix Visual Anchor Badge */}
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg shrink-0 ${
        themeClass('bg-purple-500/10 text-purple-400', 'bg-purple-50 text-purple-600')
      }`}>
        <Zap className="w-3 h-3 fill-current" />
        <span>BEST</span>
      </div>

      {Object.entries(checkoutWinners).map(([category, bestCard], idx) => {
        if (!bestCard) return null;
        
        const catName = category === 'dining' ? t('catDining') :
                        category === 'travel' ? t('catTravel') :
                        category === 'shopping' ? t('catShopping') : t('catEntertainment');

        return (
          <div key={category} className="flex items-center gap-1.5 shrink-0">
            {idx > 0 && <span className="opacity-35 text-[7px] mr-1">•</span>}
            
            {/* Subtle organic color dot anchor */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDotColor(category)}`} />
            
            <span>{catName}:</span>
            <span className={`font-black ${themeClass('text-slate-105', 'text-slate-900')}`}>{bestCard.cardName}</span>
            <span className={`font-black font-mono ${themeClass('text-emerald-400', 'text-emerald-600')}`}>
              {bestCard.ros.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
