import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ActiveBenefit } from '../utils/dateUtils';
import type { LogEntry } from '../utils/logUtils';
import { parseLogEntry } from '../utils/logUtils';
import { obfuscateKey } from '../utils/cryptoUtils';
import { AWARD_TEMPLATES } from '../data/cards.db';
import { getStepAmount } from '../utils/valuationUtils';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface ChecklistCardRowProps {
  ab: ActiveBenefit;
  logs: Record<string, LogEntry>;
  daysLeft: number | null;
  isExpired: boolean;
  isProgressive: boolean;
  spent: number;
  spentPercent: number;
  cashbackEarned: number;
  toggleBenefit: (logKey: string) => void;
  updateProgressLog: (logKey: string, spent: number) => void;
  themeClass: (dark: string, light: string) => string;
}

export const ChecklistCardRow = React.memo(function ChecklistCardRow({
  ab,
  logs,
  daysLeft,
  isExpired,
  isProgressive,
  spent,
  spentPercent,
  cashbackEarned,
  toggleBenefit,
  updateProgressLog,
  themeClass,
}: ChecklistCardRowProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];



  const { cardInstance, benefit, logKey, isUsed, loyaltyAward } = ab;
  const isStandalone = !cardInstance;

  const isProgressiveCap = benefit.spendingLimit !== undefined;
  const isAnnual = benefit.resetPeriod === 'annual-calendar' || benefit.resetPeriod === 'annual-anniversary';

  // Calculate smart expiration threshold based on resetPeriod
  const threshold = 
    benefit.resetPeriod === 'monthly' ? 7 :
    benefit.resetPeriod === 'quarterly' ? 15 : 30;

  // Smart rule: Never show countdowns for annual progressive spending limit caps!
  const isNearingExpiration = 
    (isProgressiveCap && isAnnual) 
      ? false 
      : (daysLeft !== null && daysLeft <= threshold);
  const badgeText = isStandalone
    ? (loyaltyAward ? (AWARD_TEMPLATES[loyaltyAward.templateId]?.brand || loyaltyAward.customBrand || 'Award') : 'Award')
    : cardInstance.customName;

  const getCategoryHoverClasses = () => {
    const cat = benefit.category;
    if (cat === 'dining') {
      return themeClass(
        'hover:border-rose-500/35 hover:bg-rose-950/10 hover:shadow-[0_4px_12px_rgba(244,63,94,0.05)]',
        'hover:border-rose-500/35 hover:bg-rose-50/20 hover:shadow-[0_4px_12px_rgba(244,63,94,0.035)]'
      );
    }
    if (cat === 'travel') {
      return themeClass(
        'hover:border-sky-500/35 hover:bg-sky-950/10 hover:shadow-[0_4px_12px_rgba(14,165,233,0.05)]',
        'hover:border-sky-500/35 hover:bg-sky-50/20 hover:shadow-[0_4px_12px_rgba(14,165,233,0.035)]'
      );
    }
    if (cat === 'shopping') {
      return themeClass(
        'hover:border-emerald-500/35 hover:bg-emerald-950/10 hover:shadow-[0_4px_12px_rgba(16,185,129,0.05)]',
        'hover:border-emerald-500/35 hover:bg-emerald-50/20 hover:shadow-[0_4px_12px_rgba(16,185,129,0.035)]'
      );
    }
    if (cat === 'entertainment') {
      return themeClass(
        'hover:border-purple-500/35 hover:bg-purple-950/10 hover:shadow-[0_4px_12px_rgba(168,85,247,0.05)]',
        'hover:border-purple-500/35 hover:bg-purple-50/20 hover:shadow-[0_4px_12px_rgba(168,85,247,0.035)]'
      );
    }
    return themeClass(
      'hover:border-slate-700 hover:bg-slate-900 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]',
      'hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-[0_4px_12px_rgba(15,23,42,0.02)]'
    );
  };

  return (
    <div
      onClick={() => {
        if (isExpired) return;
        if (isProgressive) {
          const limit = benefit.spendingLimit || 0;
          const isFullySpent = spent >= limit;
          updateProgressLog(logKey, isFullySpent ? 0 : limit);
        } else {
          toggleBenefit(logKey);
        }
      }}
      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition duration-200 gap-3 ${
        isExpired
          ? themeClass('bg-slate-955 border-red-955/10 opacity-40 cursor-not-allowed', 'bg-red-50/30 border-red-200/50 opacity-60 cursor-not-allowed')
          : isUsed
          ? themeClass('bg-slate-955 border-slate-900 opacity-50 cursor-pointer', 'bg-slate-100/70 border-slate-200/70 opacity-60 cursor-pointer')
          : `${themeClass('bg-slate-900/40 border-slate-850/80 cursor-pointer', 'bg-white border-slate-200/90 cursor-pointer shadow-[0_2px_6px_rgba(15,23,42,0.02)]')} ${getCategoryHoverClasses()}`
      }`}
    >
      <div className="flex items-center gap-3.5 pr-4 flex-grow">
        <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors duration-200 shrink-0 ${
          isExpired
            ? 'border-red-900 bg-red-950/10 text-red-500'
            : isUsed 
            ? 'bg-emerald-500 border-emerald-500 text-slate-955' 
            : themeClass('border-slate-700 group-hover:border-slate-500 bg-slate-955/50 text-transparent', 'border-slate-250 group-hover:border-slate-350 bg-white text-transparent')
        }`}>
          {isExpired ? (
            <span className="text-[10px] font-bold">✕</span>
          ) : (
            <CheckCircle2 className={`w-4 h-4 stroke-[3] transition-all duration-250 transform origin-center ${isUsed ? 'scale-100 rotate-0' : 'scale-0 -rotate-12 opacity-0'}`} />
          )}
        </div>

        <div className="flex-grow min-w-0">
          {!isStandalone && cardInstance && (
            <div className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1.5 ${
              themeClass('text-purple-400/90', 'text-purple-650/90')
            }`}>
              <span className="opacity-70">💳</span>
              <span>{cardInstance.customName}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold truncate ${
              isExpired ? 'text-slate-400 line-through' :
              isUsed ? 'line-through text-slate-450' : themeClass('text-slate-100', 'text-slate-800')
            }`}>
              {benefit.name}
            </span>
            {badgeText && (
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wide border shrink-0 ${
                isStandalone
                  ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/5 shadow-sm'
                  : themeClass('bg-slate-800 text-slate-300 border-slate-700', 'bg-slate-100 text-slate-600 border-slate-200')
              }`}>
                {badgeText}
              </span>
            )}
            <span className={`text-[9px] pl-1.5 pr-2 py-0.5 rounded-md font-bold tracking-wide border shrink-0 flex items-center gap-1 ${
              themeClass('bg-slate-955/30 text-slate-400 border-slate-850', 'bg-slate-50 text-slate-550 border-slate-200')
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                benefit.category === 'dining' ? 'bg-rose-500 animate-pulse' :
                benefit.category === 'travel' ? 'bg-sky-500' :
                benefit.category === 'shopping' ? 'bg-emerald-500' :
                benefit.category === 'entertainment' ? 'bg-purple-500' : 'bg-slate-400'
              }`} />
              <span className="uppercase tracking-wider text-[8px]">
                {benefit.category === 'dining' ? t('catDining') :
                 benefit.category === 'travel' ? t('catTravel') :
                 benefit.category === 'shopping' ? t('catShopping') :
                 benefit.category === 'entertainment' ? t('catEntertainment') : t('catOther')}
              </span>
            </span>
            
            {isExpired ? (
              <span className="text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.2 rounded shrink-0">{language === 'zh' ? '已过期' : 'Expired'}</span>
            ) : !isUsed && isNearingExpiration && daysLeft !== null && (
              <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded shrink-0 ${
                daysLeft <= 5 
                  ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' 
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}>
                {daysLeft <= 0 ? (language === 'zh' ? '今日到期！' : 'Expires today') : (language === 'zh' ? `剩 ${daysLeft} 天过期` : `Expires in ${daysLeft}d`)}
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${themeClass('text-slate-400', 'text-slate-500')}`}>
            {benefit.description}
          </p>

          {/* Progressive Spent Progress Bar */}
          {isProgressive && (
            <div className="mt-2.5 max-w-md">
              <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${
                    isUsed 
                      ? 'from-emerald-500 to-teal-500' 
                      : 'from-purple-500 to-indigo-500'
                  }`}
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
               {benefit.value === benefit.spendingLimit ? (
                <div className="flex justify-between items-center mt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-450">
                  <span>{language === 'zh' ? `已消费: $${spent} / $${benefit.spendingLimit} (${Math.round(spentPercent)}%)` : `Spent: $${spent} / $${benefit.spendingLimit} (${Math.round(spentPercent)}%)`}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-450">
                  <span>{language === 'zh' ? `已消费: $${spent} / $${benefit.spendingLimit} (${Math.round(spentPercent)}%)` : `Spent: $${spent} / $${benefit.spendingLimit} (${Math.round(spentPercent)}%)`}</span>
                  <span className={isUsed ? 'text-emerald-500 dark:text-emerald-400' : ''}>
                    {language === 'zh' ? `返利回本: $${cashbackEarned} / $${benefit.value}` : `Cashback: $${cashbackEarned} / $${benefit.value}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3.5 shrink-0 justify-end sm:justify-start">
        {/* Interactive Numerical Spent Input Box */}
        {isProgressive && (() => {

          const limit = benefit.spendingLimit || 0;
          const step = getStepAmount(limit);
          const currentProgress = (() => { 
            const p = parseLogEntry(logs[obfuscateKey(logKey)]); 
            return p && p.spentProgress !== undefined ? p.spentProgress : 0; 
          })();
          const isFullyResolved = currentProgress >= limit;

          return (
            <div 
              className="flex items-center gap-1.5" 
              onClick={(e) => e.stopPropagation()} // Prevent row click toggle
            >
              <span className="text-[10px] font-bold text-slate-400">$</span>
              <input
                type="number"
                disabled={isExpired}
                placeholder="0"
                value={currentProgress || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateProgressLog(logKey, val);
                }}
                className={`w-14 border text-center text-xs rounded px-1.5 py-0.5 focus:outline-none font-mono font-bold transition ${
                  themeClass('bg-slate-955 border-slate-850 text-white focus:border-purple-500', 'bg-slate-100 border-slate-250 text-slate-900 focus:border-purple-500 shadow-inner')
                }`}
              />
              <button
                disabled={isExpired || isFullyResolved}
                onClick={() => {
                  const newSpent = Math.min(currentProgress + step, limit);
                  updateProgressLog(logKey, newSpent);
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition active:scale-[0.93] shrink-0 cursor-pointer ${
                  isFullyResolved 
                    ? 'opacity-35 cursor-not-allowed border-slate-800/40 text-slate-500'
                    : themeClass('bg-purple-500/10 text-purple-400 hover:text-purple-300 border-purple-500/20 hover:bg-purple-500/20', 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200')
                }`}
                title={`Add $${step}`}
              >
                +{step}
              </button>
            </div>
          );
        })()}

        <div className="text-right flex flex-col items-end justify-center min-w-[80px]">
          <span className={`text-base font-bold ${isExpired || isUsed ? 'text-slate-400 dark:text-slate-500' : themeClass('text-white', 'text-slate-900')}`}>
            ${benefit.value}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold mt-0.5">
            {benefit.resetPeriod === 'monthly' ? (language === 'zh' ? '月度' : 'Monthly') :
             benefit.resetPeriod === 'quarterly' ? (language === 'zh' ? '季度' : 'Quarterly') :
             benefit.resetPeriod === 'semi-annual' ? (language === 'zh' ? '半年度' : 'Semi-Annual') :
             benefit.resetPeriod === 'annual-calendar' ? (language === 'zh' ? '年度' : 'Annual (Cal)') :
             benefit.resetPeriod === 'annual-anniversary' ? (language === 'zh' ? '年度 (周年)' : 'Annual (Anniv)') : 
             (language === 'zh' ? '固定周期' : 'Fixed Expir')}
          </span>
        </div>
      </div>
    </div>
  );
});
