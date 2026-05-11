import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Category organic glow dot color mapping
  const getCategoryDotColor = () => {
    const cat = benefit.category;
    if (cat === 'dining') return 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.6)]';
    if (cat === 'travel') return 'bg-sky-500 shadow-[0_0_5px_rgba(14,165,233,0.6)]';
    if (cat === 'shopping') return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]';
    if (cat === 'entertainment') return 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.6)]';
    return 'bg-slate-500';
  };

  // Typographic borderless Zen Metadata Row with organic category dot anchor
  const renderMutedMetadata = () => {
    const items: React.ReactNode[] = [];

    // 1. If flat list, render card display & template duet quietly
    if (!isGrouped && !isStandalone && cardInstance) {
      const typeName = template ? formatCardName(template.name) : (cardInstance.bank || 'Card');
      const customName = cardInstance.customName ? cardInstance.customName.trim() : '';
      const isDuplicated = !customName || customName === typeName || (template && customName === template.name);
      
      if (isDuplicated) {
        items.push(<span key="card" className="uppercase tracking-wider text-[10px]">{typeName}</span>);
      } else {
        items.push(
          <span key="card" className="uppercase tracking-wider text-[10px] flex-grow">
            <span className="font-black text-slate-500 dark:text-slate-350 mr-0.5">{customName}</span>
            <span className="font-extrabold opacity-50">│ {typeName}</span>
          </span>
        );
      }
    } else if (isStandalone && loyaltyAward) {
      const brandText = loyaltyAward.customBrand || (AWARD_TEMPLATES[loyaltyAward.templateId]?.brand) || 'Voucher';
      items.push(<span key="voucher" className="uppercase tracking-wider text-[10px] font-black text-slate-500 dark:text-slate-350">{brandText}</span>);
    }

    if (items.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 text-slate-450 dark:text-slate-505 font-bold leading-none select-none text-left w-full">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mr-0.5 ${getCategoryDotColor()}`} />
        {items[0]}
      </div>
    );
  };

  // Get color class for left border indicator
  const getCategoryBorderColor = () => {
    const cat = benefit.category;
    if (cat === 'dining') return 'border-l-rose-500';
    if (cat === 'travel') return 'border-l-sky-500';
    if (cat === 'shopping') return 'border-l-emerald-500';
    if (cat === 'entertainment') return 'border-l-purple-500';
    return 'border-l-slate-500';
  };

  return (
    <div
      onClick={() => {
        if (!isExpired) {
          setIsExpanded(!isExpanded);
        }
      }}
      className={`group flex flex-col py-[9px] px-3.5 transition-all duration-300 gap-2.5 cursor-pointer border border-l-[3.5px] rounded-xl ${getCategoryBorderColor()} ${
        isExpired
          ? themeClass('bg-slate-955/10 border-slate-850/30 opacity-40 cursor-not-allowed', 'bg-red-50/10 border-slate-200/45 opacity-65 cursor-not-allowed')
          : isUsed
          ? themeClass('bg-slate-900/20 border-slate-850/50 opacity-50', 'bg-slate-50 border-slate-200 opacity-60')
          : themeClass(
              'bg-slate-900/40 border-slate-850/80 hover:bg-slate-900/60 hover:border-slate-750 shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm', 
              'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.02)]'
            )
      }`}
    >
      {/* Row 1: Title, Checkbox, and Valuation Amount */}
      <div className="flex items-stretch justify-between gap-3.5 w-full min-w-0">
        {/* Left Details block */}
        <div className="flex items-start gap-3 min-w-0 flex-grow">
          {/* Perfect Circular Checkbox Hairlines */}
          <div 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row expansion toggle
              if (isExpired) return;
              if (isProgressive) {
                const limit = benefit.spendingLimit || 0;
                const isFullySpent = spent >= limit;
                updateProgressLog(logKey, isFullySpent ? 0 : limit);
              } else {
                toggleBenefit(logKey);
              }
            }}
            className={`w-5 h-5 flex items-center justify-center rounded-full border transition-colors duration-200 shrink-0 mt-0.5 cursor-pointer ${
              isExpired
                ? 'border-red-900 bg-red-950/10 text-red-500'
                : isUsed 
                ? 'bg-emerald-500 border-emerald-500 text-slate-955' 
                : themeClass('border-slate-500 hover:border-purple-500 bg-slate-900/60 text-transparent hover:bg-purple-500/5', 'border-slate-400 hover:border-purple-500 bg-white text-transparent hover:bg-purple-50/30')
            }`}
          >
            {isExpired ? (
              <span className="text-[10px] font-bold">✕</span>
            ) : (
              <CheckCircle2 className={`w-4 h-4 stroke-[3] transition-all duration-250 transform origin-center ${isUsed ? 'scale-100 rotate-0' : 'scale-0 -rotate-12 opacity-0'}`} />
            )}
          </div>

          {/* Title & Duet Metadata Stack */}
          {/* Title & Duet Metadata Stack */}
          <div className="flex-grow min-w-0 flex flex-col text-left gap-2 py-0.5">
            <span className={`text-sm font-extrabold mt-0.5 leading-tight ${
              isExpired ? 'text-slate-450 line-through opacity-60' :
              isUsed ? 'line-through text-slate-500 opacity-65' : themeClass('text-slate-105', 'text-slate-800')
            }`}>
              {benefit.name}
            </span>
            {renderMutedMetadata()}
          </div>
        </div>

        {/* Right amount value & period ($50 / 月) */}
        <div className="text-right flex flex-col items-end justify-start shrink-0 min-w-[90px] py-0.5 select-none gap-1">
          {/* Row 1: Amount & Period combined */}
          <div className={`flex items-baseline gap-0.5 font-mono leading-none ${isExpired || isUsed ? 'text-slate-500 opacity-60' : themeClass('text-emerald-400', 'text-emerald-600')}`}>
            <span className="text-[13px] font-black">+${benefit.value}</span>
            <span className="text-[8px] font-black uppercase tracking-widest opacity-75 ml-0.5">
              / {benefit.resetPeriod === 'monthly' ? (language === 'zh' ? '月' : 'MO') :
                 benefit.resetPeriod === 'quarterly' ? (language === 'zh' ? '季' : 'QTR') :
                 benefit.resetPeriod === 'semi-annual' ? (language === 'zh' ? '半年' : '6MO') :
                 benefit.resetPeriod === 'annual-calendar' ? (language === 'zh' ? '年' : 'YR') :
                 benefit.resetPeriod === 'annual-anniversary' ? (language === 'zh' ? '周年' : 'ANNIV') : 
                 (language === 'zh' ? '次' : 'ONCE')}
            </span>
          </div>

          {/* Row 2: Expiration Warning (Middle!) */}
          {(!isUsed && isNearingExpiration && daysLeft !== null) && (
            <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
              daysLeft <= 2 
                ? 'text-red-500 dark:text-red-400 animate-pulse' 
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {daysLeft <= 0 
                ? (language === 'zh' ? '今日到期！' : 'TODAY') 
                : (language === 'zh' ? `剩 ${daysLeft} 天` : `${daysLeft}D LEFT`)}
            </span>
          )}

          {/* Row 3: Expiration Date (Bottom!) */}
          {benefit.expirationDate && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-505 mt-0.5">
              {t('expiresLabel')}: {benefit.expirationDate}
            </span>
          )}
        </div>
      </div>

      {/* Collapsible Accordion Drawer (Description & Progressive controllers) */}
      <div className={`transition-all duration-280 ease-in-out overflow-hidden ${
        isExpanded 
          ? 'max-h-[450px] opacity-100 mt-1' 
          : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        {benefit.description && (
          <p className={`text-xs leading-relaxed pl-[38px] pb-2.5 w-full text-left ${themeClass('text-slate-400', 'text-slate-500')}`}>
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
                            'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
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
    </div>
  );
});
