import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

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
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  if (activeTab !== 'cards' || deckSubTab !== 'cards' || !checkoutWinners) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar shrink-0 animate-fade-in">
      {Object.entries(checkoutWinners).map(([category, bestCard]) => {
        if (!bestCard) return null;
        
        const catName = category === 'dining' ? t('catDining') :
                        category === 'travel' ? t('catTravel') :
                        category === 'shopping' ? t('catShopping') : t('catEntertainment');
                        
        const emoji = category === 'dining' ? '🍽️' :
                      category === 'travel' ? '✈️' :
                      category === 'shopping' ? '🛍️' : '🎬';
                      
        const badgeColor = category === 'dining' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20' :
                           category === 'travel' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20' :
                           category === 'shopping' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' :
                           'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20';

        return (
          <div 
            key={category}
            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${badgeColor}`}
            title={language === 'zh' 
              ? `👑 ${bestCard.cardName} 实际消费收益率为 ${bestCard.ros.toFixed(1)}% (${bestCard.multiplier}x 积点)` 
              : `👑 ${bestCard.cardName} Return-on-Spend is ${bestCard.ros.toFixed(1)}% (${bestCard.multiplier}x multipliers)`
            }
          >
            <span>{emoji} {catName}:</span>
            <span className="opacity-75 font-black">{bestCard.cardName}</span>
            <span className="bg-white/15 px-1.5 py-0.2 rounded text-[8px] font-extrabold shrink-0">
              {bestCard.ros.toFixed(1)}%
            </span>
            <span>👑</span>
          </div>
        );
      })}
    </div>
  );
}
