import { X, Info, Calendar, Heart, ExternalLink, Zap, Settings } from 'lucide-react';
import type { CardTemplate } from '../data/cards.db';
import { CARD_MULTIPLIERS } from '../data/cards.db';
import { getAnnualValue } from '../utils/valuationUtils';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface CardDetailDrawerProps {
  isOpen: boolean;
  card: CardTemplate | null;
  onClose: () => void;
  onAdd: () => void;
  onConfigureAdd: () => void;
  theme: 'dark' | 'light';
}

export function CardDetailDrawer({ isOpen, card, onClose, onAdd, onConfigureAdd, theme }: CardDetailDrawerProps) {
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
  const currency = card.pointCurrency || 'cash';
  const cpp = useCardStore.getState().pointValuations?.[currency] || 1.0;

  return (
    // Backdrop overlay
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-955/50 dark:bg-slate-955/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      {/* Bottom Sheet (Mobile) & Centered Modal (Desktop) */}
      <div 
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click close
        className={`w-full sm:max-w-md border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transition-colors focus:outline-none relative
          max-sm:rounded-t-2xl max-sm:max-h-[80vh] max-sm:max-h-[80dvh] max-sm:animate-slide-sheet max-sm:w-screen max-sm:pb-6
          sm:rounded-2xl sm:max-h-[600px] sm:animate-scale-up ${
            themeClass(
              'bg-slate-900 border-slate-800 shadow-[0_10px_50px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.04)] text-slate-105', 
              'bg-white border-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.02),_inset_0_1px_0_rgba(255,255,255,0.8)] text-slate-800'
            )
          }`}
      >
        {/* Mobile Drag/Capsule Pull Bar */}
        <div className="sm:hidden w-10 h-1 bg-slate-300/40 dark:bg-slate-700/40 rounded-full mx-auto my-3 shrink-0" />

        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-xl transition active:scale-90 cursor-pointer z-20 ${
            themeClass('text-slate-400 hover:text-white hover:bg-white/5', 'text-slate-505 hover:text-slate-900 hover:bg-black/5')
          }`}
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Header Title */}
        <div className="px-5 pt-5 pb-2 flex items-center gap-3 shrink-0 text-left">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 shrink-0">
            <Heart className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <h3 className={`text-sm font-black ${themeClass('text-white', 'text-slate-900')}`}>{card.name}</h3>
            <p className={`text-[10px] font-medium ${themeClass('text-slate-405', 'text-slate-505')}`}>{card.bank} {t('cardTemplateTitle')}</p>
          </div>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-grow scrollbar-thin">
          {/* 💳 Luxury Metallic Mini-Card Preview */}
          <div className={`w-full aspect-[1.586] p-5 sm:p-6 rounded-2xl bg-gradient-to-tr ${cardColor} shadow-2xl text-white relative overflow-hidden flex flex-col justify-between shrink-0 select-none`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-75">{card.bank}</span>
              </div>
              
              {/* Golden EMV Chip Simulation */}
              <div className="w-9 h-7 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md opacity-85 border border-yellow-200/40 relative overflow-hidden mt-1.5 shadow-sm">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 border border-yellow-700/20">
                  <div className="border-r border-b border-yellow-700/20" />
                  <div className="border-r border-b border-yellow-700/20" />
                  <div className="border-b border-yellow-700/20" />
                  <div className="border-r border-yellow-700/20" />
                  <div className="border-r border-yellow-700/20" />
                  <div />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-sm border border-yellow-200/30" />
              </div>
            </div>
            
            <div className="flex justify-between items-end pt-4">
              <div className="flex gap-4 sm:gap-6">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-widest opacity-60 leading-none">{t('potentialValue')}</p>
                  <p className="text-sm sm:text-base font-black mt-0.5 leading-none">${card.benefits.reduce((sum, b) => sum + getAnnualValue(b), 0)}/{language === 'zh' ? '年' : 'yr'}</p>
                </div>
                <div>
                  <p className="text-[7px] font-black uppercase tracking-widest opacity-60 leading-none">{t('annualFeeLabel')}</p>
                  <p className="text-sm sm:text-base font-black mt-0.5 leading-none">${card.annualFee}/{language === 'zh' ? '年' : 'yr'}</p>
                </div>
              </div>
              <span className="text-[7.5px] font-black uppercase bg-white/15 px-2 py-0.5 rounded border border-white/5 shrink-0">
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
          themeClass('bg-slate-900/40 border-slate-850', 'bg-slate-50 border-slate-200')
        }`}>
          <button
            onClick={onClose}
            className={`w-1/4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
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
            className={`w-[35%] flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer shadow-sm ${
              themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
            {language === 'zh' ? '闪电添加' : 'Quick Add'}
          </button>
          <button
            onClick={() => {
              onConfigureAdd();
              onClose();
            }}
            className={`w-[40%] flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer shadow-sm ${
              themeClass('bg-gradient-to-tr from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700/50 text-white', 'bg-gradient-to-tr from-slate-900 to-black hover:from-slate-800 hover:to-slate-900 text-white')
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {language === 'zh' ? '配置并添加' : 'Configure & Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
