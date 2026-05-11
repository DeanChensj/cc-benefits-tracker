import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ActiveBenefit } from '../utils/dateUtils';
import type { LogEntry } from '../utils/logUtils';
import { parseLogEntry } from '../utils/logUtils';
import { obfuscateKey } from '../utils/cryptoUtils';
import { AWARD_TEMPLATES, CARDS_DB } from '../data/cards.db';
import { getStepAmount } from '../utils/valuationUtils';
import { useCardStore } from '../store/useCardStore';
import { translations, formatCardName } from '../utils/i18n';

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
  isGrouped?: boolean;
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
  isGrouped = false,
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
  const template = cardInstance && cardInstance.templateId !== 'custom'
    ? CARDS_DB.find(t => t.id === cardInstance.templateId)
    : null;

  // Split-Pill Badge Render helper for Zen graphite & alabaster aesthetics
  const renderCardBadge = () => {
    if (isStandalone) {
      const brandText = loyaltyAward 
        ? (AWARD_TEMPLATES[loyaltyAward.templateId]?.brand || loyaltyAward.customBrand || 'Award') 
        : 'Award';
      return (
        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold tracking-wider border shrink-0 ${
          themeClass(
            'bg-purple-500/10 text-purple-400 border-purple-900/30', 
            'bg-purple-50 text-purple-600 border-purple-200 shadow-sm'
          )
        }`}>
          {brandText}
        </span>
      );
    }

    if (!cardInstance) return null;

    const typeName = template ? formatCardName(template.name) : (cardInstance.bank || 'Card');
    const customName = cardInstance.customName ? cardInstance.customName.trim() : '';

    // Smart de-duplication for Zen mode
    const isDuplicated = !customName || customName === typeName || (template && customName === template.name);

    if (isDuplicated) {
      return (
        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold tracking-wider border shrink-0 ${
          themeClass(
            'bg-slate-800/50 text-slate-300 border-slate-800/80', 
            'bg-slate-100 text-slate-650 border-slate-250 shadow-sm'
          )
        }`}>
          {typeName}
        </span>
      );
    }

    // Split-Pill Badge
    return (
      <span className={`inline-flex items-center text-[9px] rounded-md border shrink-0 overflow-hidden ${
        themeClass('border-slate-800/80', 'border-slate-250')
      }`}>
        <span className={`px-2 py-0.5 font-black border-r ${
          themeClass(
            'bg-slate-800/80 text-slate-100 border-slate-800/80', 
            'bg-slate-200/60 text-slate-800 border-slate-200'
          )
        }`}>
          {customName}
        </span>
        <span className={`px-1.5 py-0.5 font-medium ${
          themeClass('bg-slate-900/30 text-slate-450', 'bg-slate-50 text-slate-505')
        }`}>
          {typeName}
        </span>
      </span>
    );
  };

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
      className={`group flex flex-col p-3.5 rounded-xl border transition duration-200 gap-3.5 ${
        isExpired
          ? themeClass('bg-slate-955 border-red-955/10 opacity-40 cursor-not-allowed', 'bg-red-50/30 border-red-200/50 opacity-60 cursor-not-allowed')
          : isUsed
          ? themeClass('bg-slate-955 border-slate-900 opacity-50 cursor-pointer', 'bg-slate-100/70 border-slate-200/70 opacity-60 cursor-pointer')
          : `${themeClass('bg-slate-900/40 border-slate-850/80 cursor-pointer', 'bg-white border-slate-200/90 cursor-pointer shadow-[0_2px_6px_rgba(15,23,42,0.02)]')} ${getCategoryHoverClasses()}`
      }`}
    >
      {/* Row 1: Title, Checkbox, and Valuation Amount */}
      <div className="flex items-start justify-between gap-3.5 w-full min-w-0">
        {/* Left Details block */}
        <div className="flex items-start gap-3 min-w-0 flex-grow">
          {/* Checkbox */}
          <div className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors duration-200 shrink-0 mt-0.5 ${
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

          {/* Title & Details */}
          <div className="flex-grow min-w-0">
            <span className={`text-sm font-extrabold truncate mt-0.5 ${
              isExpired ? 'text-slate-400 line-through' :
              isUsed ? 'line-through text-slate-450' : themeClass('text-slate-100', 'text-slate-800')
            }`}>
              {benefit.name}
            </span>
          </div>
        </div>

        {/* Right amount value & period ($50 / 月) */}
        <div className="text-right flex items-baseline justify-end shrink-0 min-w-[80px] gap-0.5 mt-1 select-none">
          <span className={`text-sm font-black tracking-tight leading-none ${isExpired || isUsed ? 'text-slate-400 dark:text-slate-550' : themeClass('text-white', 'text-slate-900')}`}>
            ${benefit.value}
          </span>
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 leading-none select-none">
            &nbsp;/&nbsp;{benefit.resetPeriod === 'monthly' ? (language === 'zh' ? '月' : 'mo') :
               benefit.resetPeriod === 'quarterly' ? (language === 'zh' ? '季' : 'qtr') :
               benefit.resetPeriod === 'semi-annual' ? (language === 'zh' ? '半年' : '6mo') :
               benefit.resetPeriod === 'annual-calendar' ? (language === 'zh' ? '年' : 'yr') :
               benefit.resetPeriod === 'annual-anniversary' ? (language === 'zh' ? '周年' : 'anniv') : 
               (language === 'zh' ? '单次' : 'once')}
          </span>
        </div>
      </div>

      {/* Row 2: Left-Aligned Metadata Row (Expiration date, warning countdowns) */}
      <div className="flex flex-wrap items-center gap-2.5 pl-[38px] -mt-2 w-full select-none">
        {/* A. Standalone Voucher Badge OR Card Brand Badge (only if Flat List view!) */}
        {(isStandalone || !isGrouped) && renderCardBadge()}

        {/* B. Expiration Date raw text (pure sumi style) */}
        {benefit.expirationDate && (
          <span className={`text-[8px] font-black tracking-widest uppercase shrink-0 py-0.5 ${
            isUsed ? 'line-through opacity-35 text-slate-500' : themeClass('text-slate-400', 'text-slate-500')
          }`}>
            {t('expiresLabel')}: {benefit.expirationDate}
          </span>
        )}

        {/* C. Expiration Countdowns / warning status */}
        {isExpired ? (
          <span className="text-[8.5px] font-extrabold bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded shrink-0">
            {language === 'zh' ? '已过期' : 'Expired'}
          </span>
        ) : !isUsed && isNearingExpiration && daysLeft !== null && (
          <span className={`text-[8.5px] font-extrabold border px-2 py-0.5 rounded shrink-0 ${
            daysLeft <= 5 
              ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' 
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          }`}>
            {daysLeft <= 0 ? (language === 'zh' ? '今日到期！' : 'Expires today') : (language === 'zh' ? `剩 ${daysLeft} 天` : `Expires in ${daysLeft}d`)}
          </span>
        )}
      </div>

      {/* Row 1.5: Dedicated Full-Width Description (Perfect Mobile Left Alignment!) */}
      {benefit.description && (
        <p className={`text-xs mt-0.5 leading-relaxed pl-[38px] w-full text-left ${themeClass('text-slate-400', 'text-slate-500')}`}>
          {benefit.description}
        </p>
      )}

      {/* Row 2: Symmetrical Recessed Accumulator Widget Well (Progressive benefits only) */}
      {isProgressive && (() => {
        const limit = benefit.spendingLimit || 0;
        const step = getStepAmount(limit);
        const currentProgress = (() => { 
          const p = parseLogEntry(logs[obfuscateKey(logKey)]); 
          return p && p.spentProgress !== undefined ? p.spentProgress : 0; 
        })();
        const isFullyResolved = currentProgress >= limit;
        const isZeroProgress = currentProgress <= 0;

        return (
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent row click checklist toggle
            className={`p-3.5 sm:p-4 mt-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-5 w-full transition-all duration-300 ${
              themeClass(
                'bg-slate-950/20 border-slate-850/45', 
                'bg-slate-50/40 border-slate-200/80 shadow-[inset_0_1px_3px_rgba(15,23,42,0.01)]'
              )
            }`}
          >
            {/* Tactile Symmetrical Control Capsule */}
            <div className="flex items-center shrink-0 sm:my-1">
              <div className={`flex items-center rounded-lg border overflow-hidden text-xs ${
                themeClass('border-slate-800 bg-slate-900/25', 'border-slate-250 bg-white shadow-sm')
              }`}>
                {/* Left segment: Decrement (-) */}
                <button
                  type="button"
                  disabled={isExpired || isZeroProgress}
                  onClick={() => {
                    const newSpent = Math.max(currentProgress - step, 0);
                    updateProgressLog(logKey, newSpent);
                  }}
                  className={`px-3 py-1.5 text-[9px] font-black tracking-wider uppercase transition duration-150 select-none cursor-pointer active:scale-[0.92] shrink-0 ${
                    isZeroProgress || isExpired
                      ? 'opacity-35 cursor-not-allowed text-slate-500'
                      : themeClass(
                          'text-slate-400 hover:bg-slate-850 hover:text-slate-200', 
                          'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        )
                  }`}
                  title={language === 'zh' ? `减少 $${step}` : `Reduce $${step}`}
                >
                  -{step}
                </button>

                {/* Center segment: Value input with dollar prefix */}
                <div className={`flex items-center px-2 py-1.5 border-l border-r ${
                  themeClass('border-slate-800 bg-slate-955/40', 'border-slate-200 bg-slate-50/30')
                }`}>
                  <span className="text-[9.5px] font-bold text-slate-450 dark:text-slate-500 select-none mr-0.5">$</span>
                  <input
                    type="number"
                    disabled={isExpired}
                    placeholder="0"
                    value={currentProgress || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateProgressLog(logKey, val);
                    }}
                    className={`w-10 border-0 p-0 text-center text-xs bg-transparent focus:outline-none font-mono font-black ${
                      themeClass('text-slate-200 focus:text-white', 'text-slate-800 focus:text-slate-900')
                    }`}
                  />
                </div>

                {/* Right segment: Increment (+) */}
                <button
                  type="button"
                  disabled={isExpired || isFullyResolved}
                  onClick={() => {
                    const newSpent = Math.min(currentProgress + step, limit);
                    updateProgressLog(logKey, newSpent);
                  }}
                  className={`px-3 py-1.5 text-[9px] font-black tracking-wider uppercase transition duration-150 select-none cursor-pointer active:scale-[0.92] shrink-0 ${
                    isFullyResolved || isExpired
                      ? 'opacity-35 cursor-not-allowed text-slate-500'
                      : themeClass(
                          'bg-purple-500/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/25', 
                          'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        )
                  }`}
                  title={language === 'zh' ? `增加 $${step}` : `Add $${step}`}
                >
                  +{step}
                </button>
              </div>
            </div>

            {/* Symmetrical Dashboard Stats Widget with Value-Label Stack */}
            <div className="flex-grow w-full sm:max-w-[240px] flex flex-col gap-2 sm:px-1 select-none">
              {/* Dual Column Stacked Value & Label */}
              <div className="flex justify-between items-end w-full">
                {/* Left: Spent progress */}
                <div className="flex flex-col items-start gap-0.5">
                  <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${themeClass('text-slate-455', 'text-slate-500')}`}>
                    {language === 'zh' ? '已消费' : 'Spent'}
                  </span>
                  <span className={`text-xs font-black font-mono mt-0.5 leading-none ${themeClass('text-slate-200', 'text-slate-750')}`}>
                    ${currentProgress} <span className="text-[9.5px] font-medium text-slate-450 dark:text-slate-500">/ ${limit}</span>
                  </span>
                </div>

                {/* Right: Cashback earned */}
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${themeClass('text-slate-455', 'text-slate-500')}`}>
                    {language === 'zh' ? '已回本' : 'Earned'}
                  </span>
                  <span className="text-xs font-black font-mono mt-0.5 leading-none text-emerald-500 dark:text-emerald-450">
                    +${cashbackEarned}
                  </span>
                </div>
              </div>

              {/* 2px Gold Threadline Progress Bar */}
              <div className="h-[2px] w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden mt-0.5">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${
                    isUsed 
                      ? 'from-emerald-500 to-teal-400' 
                      : 'from-purple-500 to-indigo-400'
                  }`}
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});
