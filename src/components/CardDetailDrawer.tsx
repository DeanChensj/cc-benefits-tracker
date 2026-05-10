import { X, Plus, Info, Calendar, Heart, ExternalLink } from 'lucide-react';
import type { CardTemplate } from '../data/cards.db';
import { CARD_MULTIPLIERS, getCardTemplateCurrency } from '../data/cards.db';
import { getAnnualValue } from '../utils/valuationUtils';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface CardDetailDrawerProps {
  isOpen: boolean;
  card: CardTemplate | null;
  onClose: () => void;
  onAdd: () => void;
  theme: 'dark' | 'light';
}

export function CardDetailDrawer({ isOpen, card, onClose, onAdd, theme }: CardDetailDrawerProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const getResetPeriodLabel = (period: string) => {
    if (language !== 'zh') {
      if (period === 'monthly') return 'Monthly';
      if (period === 'quarterly') return 'Quarterly';
      if (period === 'semi-annual') return 'Semi-Annual';
      if (period === 'annual-calendar') return 'Calendar Year';
      if (period === 'annual-anniversary') return 'Anniversary';
      return 'One-Time';
    }
    if (period === 'monthly') return '按月重置';
    if (period === 'quarterly') return '按季重置';
    if (period === 'semi-annual') return '每半年重置';
    if (period === 'annual-calendar') return '自然年刷新';
    if (period === 'annual-anniversary') return '持卡周年重置';
    return '单次/固定到期';
  };



  if (!isOpen || !card) return null;

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const cardColor = card.color || 'from-slate-800 to-slate-900';
  
  const multipliers = CARD_MULTIPLIERS[card.id] || null;
  const hasMultipliers = multipliers && Object.values(multipliers).some((v) => typeof v === 'number' && v > 1);
  const currency = getCardTemplateCurrency(card.id);
  const cpp = useCardStore.getState().pointValuations?.[currency] || 1.0;

  return (
    // Backdrop overlay
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-955/40 dark:bg-slate-950/75 backdrop-blur-[3px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      {/* Bottom Sheet (Mobile) & Centered Modal (Desktop) */}
      <div 
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click close
        className={`w-full sm:max-w-md border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transition-colors focus:outline-none
          max-sm:rounded-t-2xl max-sm:max-h-[80vh] max-sm:max-h-[80dvh] max-sm:animate-slide-sheet max-sm:w-screen max-sm:pb-6
          sm:rounded-2xl sm:max-h-[600px] sm:animate-scale-up ${
            themeClass('bg-slate-900/90 border-slate-800/60 text-slate-100 backdrop-blur-xl shadow-slate-950/50', 'bg-white/95 border-slate-200/90 text-slate-800 backdrop-blur-xl shadow-slate-300/30')
          }`}
      >
        {/* Mobile Drag/Capsule Pull Bar */}
        <div className="sm:hidden w-10 h-1 bg-slate-300/40 dark:bg-slate-700/40 rounded-full mx-auto my-3 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
          <div>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              themeClass('bg-slate-900/60 text-purple-400', 'bg-slate-100 text-purple-600')
            }`}>
              {card.bank} {t('cardTemplateTitle')}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition cursor-pointer ${
              themeClass('text-slate-455 hover:bg-slate-800 hover:text-slate-200', 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-grow scrollbar-thin">
          {/* 💳 Luxury Metallic Mini-Card Preview */}
          <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-tr ${cardColor} shadow-lg text-white relative overflow-hidden min-h-[130px] flex flex-col justify-between shrink-0 select-none after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-1000 hover:after:left-[150%]`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-75">{card.bank}</span>
                <Heart className="w-4 h-4 opacity-40 fill-white/10" />
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-1.5">{card.name}</h3>
            </div>
            
            <div className="flex justify-between items-end pt-4">
              <div className="flex gap-3 sm:gap-6">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">{t('potentialValue')}</p>
                  <p className="text-sm sm:text-base font-black">${card.benefits.reduce((sum, b) => sum + getAnnualValue(b), 0)}/{language === 'zh' ? '年' : 'yr'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">{t('annualFeeLabel')}</p>
                  <p className="text-sm sm:text-base font-black">${card.annualFee}/{language === 'zh' ? '年' : 'yr'}</p>
                </div>
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded border border-white/5 shrink-0">
                {card.benefits.length} {t('perksSuffix')}
              </span>
            </div>
          </div>

          {card.officialUrl && (
            <a
              href={card.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-1.5 border rounded-xl py-2.5 text-[11px] font-bold transition cursor-pointer ${
                themeClass('bg-slate-955/35 border-slate-850 hover:bg-slate-850 hover:border-slate-750 text-purple-400', 'bg-slate-50 border-slate-250/80 hover:bg-slate-100 hover:border-slate-300 text-purple-600 shadow-sm')
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('viewOfficialDetails')}</span>
            </a>
          )}

          {/* Premium Card Point Multipliers section */}
          {hasMultipliers && (
            <div className={`p-3 rounded-xl border text-left space-y-2 ${
              themeClass('bg-white/5 border-white/5', 'bg-slate-955/5 border-slate-800/10')
            }`}>
              <div className="flex items-center justify-between min-w-0 gap-1.5">
                <p className={`text-[9.5px] font-extrabold uppercase tracking-wider truncate ${themeClass('text-purple-400', 'text-purple-600')}`}>
                  {t(`curr_${currency.replace('-', '_')}` as keyof typeof translations['en'])}
                </p>
                {currency !== 'cash' && (
                  <span className="text-[7.5px] font-black px-1 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-450 dark:text-purple-300 border border-purple-500/15 shrink-0">
                    {cpp} cpp
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {multipliers && Object.entries(multipliers)
                  .filter(([, val]) => val && val > 1)
                  .map(([category, val]) => (
                    <span 
                      key={category}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9.5px] font-black border shadow-sm select-none ${
                        themeClass('bg-slate-955 border-slate-850 text-slate-300', 'bg-slate-100 border-slate-250 text-slate-700')
                      }`}
                      title={`${category}: ${val}x`}
                    >
                      <span>
                        {category === 'dining' ? '🍽️' :
                         category === 'travel' ? '✈️' :
                         category === 'shopping' ? '🛒' : '🎬'}
                      </span>
                      <span>{t(`cat${category.charAt(0).toUpperCase() + category.slice(1)}Badge` as keyof typeof translations['en'])}</span>
                      <span className={`w-1 h-1 rounded-full opacity-30 ${themeClass('bg-white', 'bg-slate-800')}`} />
                      <span className={themeClass('text-purple-400', 'text-purple-650 font-black')}>{val}x</span>
                    </span>
                  ))
                }
              </div>
            </div>
          )}

          {/* 📋 Built-in Perks List */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              themeClass('text-slate-450', 'text-slate-555')
            }`}>
              <Info className="w-3.5 h-3.5 text-purple-500" />
              {t('builtInPerksTitle')} ({card.benefits.length})
            </h4>

            <div className="space-y-2.5">
              {card.benefits.map((b) => (
                <div 
                  key={b.id} 
                  className={`p-3 rounded-xl border space-y-1 transition duration-200 ${
                    themeClass('bg-slate-955/50 border-slate-850 hover:border-slate-800', 'bg-slate-50/80 border-slate-200/75 hover:border-slate-250 shadow-inner')
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[12px] font-bold ${themeClass('text-slate-200', 'text-slate-800')}`}>
                      {b.name}
                    </span>
                    <span className={`text-xs font-black shrink-0 ${themeClass('text-amber-400', 'text-purple-600')}`}>
                      +${b.value}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-normal ${themeClass('text-slate-400', 'text-slate-550')}`}>
                    {b.description}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1 text-[9px] font-bold tracking-wide uppercase text-slate-550 shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{t('resetPeriodLabel')} {getResetPeriodLabel(b.resetPeriod)}</span>
                    {b.spendingLimit && (
                      <span className="text-purple-500 dark:text-amber-500">
                        • {t('limitLabel')}{b.spendingLimit} {t('spentSuffix')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA Action Bar (High-Contrast) */}
        <div className={`px-5 py-4 border-t flex gap-3 shrink-0 ${
          themeClass('bg-slate-950/50 border-slate-850', 'bg-slate-50 border-slate-200')
        }`}>
          <button
            onClick={onClose}
            className={`w-1/3 font-semibold py-3 rounded-xl text-xs transition cursor-pointer ${
              themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
            }`}
          >
            {t('close')}
          </button>
          <button
            onClick={() => {
              onAdd();
              onClose();
            }}
            className="w-2/3 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-3 rounded-xl text-xs transition active:scale-[0.98] flex items-center justify-center gap-1 shadow-lg shadow-purple-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            {t('addCardToWallet')}
          </button>
        </div>
      </div>
    </div>
  );
}
