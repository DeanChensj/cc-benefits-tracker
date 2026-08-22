import React, { useState, useEffect } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
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

  
  const [localUsed, setLocalUsed] = useState(isUsed);

  const getBenefitDescription = (b: typeof benefit) => {
    if (b.description) return b.description;
    if (b.type === 'welcome-offer' && b.spendingLimit && b.expirationDate && cardInstance?.cardOpenDate) {
      const openDate = new Date(cardInstance.cardOpenDate);
      const expDate = new Date(b.expirationDate);
      const months = (expDate.getFullYear() - openDate.getFullYear()) * 12 + (expDate.getMonth() - openDate.getMonth());
      return `Spend $${b.spendingLimit} in ${months} months`;
    }
    return '';
  };
  
  useEffect(() => {
    setLocalUsed(isUsed);
  }, [isUsed]);
  
  const skipBenefit = useCardStore((state) => state.skipBenefit);
  const logVal = logs[obfuscateKey(logKey)];
  const parsed = parseLogEntry(logVal);
  const isSkipped = !!(parsed && parsed.skipped);

  const isProgressiveCap = benefit.spendingLimit !== undefined;
  const isAnnual = benefit.resetPeriod === 'annual-calendar' || benefit.resetPeriod === 'annual-anniversary';

  // Calculate urgency level based on resetPeriod and daysLeft
  const getUrgencyLevel = () => {
    if (daysLeft === null) return 0;
    if (isProgressiveCap && isAnnual) return 0; // Never show countdowns for annual progressive spending limit caps!
    
    const period = benefit.resetPeriod;
    
    if (period === 'monthly') {
      if (daysLeft <= 1) return 3;
      if (daysLeft <= 3) return 2;
      if (daysLeft <= 7) return 1;
    } else if (period === 'quarterly') {
      if (daysLeft <= 3) return 3;
      if (daysLeft <= 7) return 2;
      if (daysLeft <= 15) return 1;
    } else if (period === 'semi-annual') {
      if (daysLeft <= 7) return 3;
      if (daysLeft <= 15) return 2;
      if (daysLeft <= 30) return 1;
    } else if (period === 'annual-calendar' || period === 'annual-anniversary') {
      if (daysLeft <= 7) return 3;
      if (daysLeft <= 15) return 2;
      if (daysLeft <= 45) return 1;
    } else if (period === 'once' || period === 'fixed') {
      if (daysLeft <= 7) return 3;
      if (daysLeft <= 15) return 2;
      if (daysLeft <= 30) return 1;
    }
    
    return 0;
  };
  
  const urgencyLevel = getUrgencyLevel();
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
      const typeName = template ? formatCardName(template.name) : (cardInstance.bank || t('card'));
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
      const brandText = loyaltyAward.customBrand || (AWARD_TEMPLATES[loyaltyAward.templateId]?.brand) || t('voucher');
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
    if (benefit.type === 'welcome-offer') return 'border-l-purple-600';
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
      className={`group relative w-full flex flex-col py-[9px] px-3.5 transition-all duration-300 gap-2.5 cursor-pointer border border-l-[3.5px] rounded-xl overflow-hidden ${getCategoryBorderColor()} ${
        isExpired
          ? themeClass('bg-slate-955/10 border-slate-850/30 opacity-40 cursor-not-allowed', 'bg-red-50/10 border-slate-200/45 opacity-65 cursor-not-allowed')
          : isUsed
          ? themeClass('bg-slate-900/20 border-slate-850/50 opacity-50', 'bg-slate-50 border-slate-200 opacity-60')
          : benefit.type === 'welcome-offer'
          ? themeClass('bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-slate-900/50 border-purple-700/30', 'bg-gradient-to-br from-purple-50/50 via-white to-white border-purple-200')
          : themeClass(
              'bg-slate-900/40 border-slate-850/80 hover:bg-slate-900/60 hover:border-slate-750 shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm', 
              'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.02)]'
            )
      }`}
    >

      
      {/* Row 1: Title, Checkbox, and Valuation Amount */}
      <div className="flex items-stretch gap-3.5 w-full min-w-0 relative z-10">
        {/* Full Width Strikethrough Line (Starting after checkbox!) */}
        {!isUsed && (
          <div className={`absolute left-[32px] w-[calc(100%-32px)] top-1/2 -translate-y-1/2 h-[1px] bg-emerald-500 transition-all duration-300 ${localUsed ? 'scale-x-100' : 'scale-x-0'} origin-left z-20 pointer-events-none`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
        )}
        
        {/* Left Details block */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Checkbox hit target wrapper */}
          <div 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row expansion toggle
              if (isExpired || benefit.isSubscription) return;
              if (isProgressive) {
                const limit = benefit.spendingLimit || 0;
                const isFullySpent = spent >= limit;
                updateProgressLog(logKey, isFullySpent ? 0 : limit);
              } else {
                setLocalUsed(!localUsed);
                setTimeout(() => {
                  toggleBenefit(logKey);
                }, 300);
              }
            }}
            className="p-2.5 -m-2.5 shrink-0 select-none flex items-center justify-center"
          >
            <div
              className={`w-5 h-5 flex items-center justify-center rounded-md border transition-all duration-150 shrink-0 ${
                benefit.isSubscription ? 'cursor-default opacity-90' : 'cursor-pointer active:scale-[0.88]'
              } ${localUsed ? 'animate-bounce-subtle' : ''} ${
                isExpired
                  ? 'border-red-900 bg-red-950/10 text-red-500'
                  : isUsed 
                  ? 'bg-emerald-500 border-emerald-500 text-slate-955' 
                  : themeClass('border-slate-600 hover:border-emerald-400 bg-slate-900/60 text-transparent hover:bg-emerald-500/5', 'border-slate-300 hover:border-emerald-500 bg-white text-transparent hover:bg-emerald-50/30')
              }`}
            >
              {isExpired ? (
                <span className="text-[10px] font-bold">✕</span>
              ) : (
                <CheckCircle2 className={`w-4 h-4 stroke-[2.5] transition-all duration-250 transform origin-center ${isUsed ? 'scale-100 rotate-0' : 'scale-0 -rotate-12 opacity-0'}`} />
              )}
            </div>
          </div>

          {/* Title & Duet Metadata Stack */}
          <div className="w-full min-w-0 flex flex-col text-left gap-1.5 py-0.5">
            <div className="relative min-w-full flex items-baseline gap-1.5">

              <span className={`text-sm font-bold mt-0.5 leading-tight ${
                isExpired ? 'text-slate-500 line-through opacity-60' :
                isUsed ? 'text-slate-500 line-through opacity-65' : themeClass('text-slate-100', 'text-slate-800')
              }`}>
                {benefit.name}
              </span>
              {benefit.type === 'welcome-offer' && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase rounded-md tracking-wider shrink-0 ${
                  themeClass('bg-purple-500/20 text-purple-300', 'bg-purple-500/10 text-purple-600')
                }`}>
                  {t('subBadge')}
                </span>
              )}
              {benefit.isSubscription && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-md tracking-wider shrink-0 select-none ${
                  themeClass('bg-indigo-500/20 text-indigo-300 border border-indigo-500/30', 'bg-indigo-50/80 text-indigo-600 border border-indigo-200')
                }`}>
                  {language === 'zh' ? '自动打卡' : 'Auto'}
                </span>
              )}
              
            </div>
            
            {/* Sub-categories pill badges */}
            {benefit.subCategories && benefit.subCategories.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap -mt-0.5">
                {benefit.subCategories.map((sub, idx) => (
                  <span key={idx} className={`px-1.5 py-0.5 rounded text-[9.5px] font-medium tracking-wide uppercase border ${
                    themeClass('bg-slate-900 text-amber-300 border-slate-800', 'bg-slate-100 text-amber-800 border-slate-200')
                  }`}>
                    {sub}
                  </span>
                ))}
              </div>
            )}

            {renderMutedMetadata()}
          </div>
        </div>

        {/* Right amount value & period ($50 / 月) */}
        <div className={`text-right flex flex-col items-end justify-start shrink-0 w-[140px] py-0.5 select-none gap-0.5 pl-2 border-l ${themeClass('border-slate-800/40', 'border-slate-200/80')}`}>
          {/* Row 1: Amount & Period combined */}
          <div className={`flex items-baseline gap-1 font-mono leading-none ${isExpired || isUsed ? 'text-slate-500 opacity-60' : themeClass('text-emerald-400', 'text-emerald-600')}`}>
            <span className="text-sm font-bold tabular-nums tracking-tight">+${benefit.value}</span>
            <span className="text-[9.5px] font-medium uppercase tracking-wider opacity-75 font-sans">
              / {benefit.resetPeriod === 'monthly' ? t('perMonth') :
                 benefit.resetPeriod === 'quarterly' ? t('perQuarter') :
                 benefit.resetPeriod === 'semi-annual' ? t('perHalfYear') :
                 benefit.resetPeriod === 'annual-calendar' ? t('perYear') :
                 benefit.resetPeriod === 'annual-anniversary' ? t('perAnniversary') : 
                 t('perOnce')}
            </span>
          </div>

          {/* Row 2: Expiration Warning (Middle!) */}
          {(!isUsed && !isExpired && urgencyLevel > 0 && daysLeft !== null) && (
            <span className={`text-[9.5px] font-semibold uppercase tracking-wider font-mono tabular-nums mt-0.5 ${
              urgencyLevel === 3
                ? 'text-red-400 animate-pulse'
                : urgencyLevel === 2
                ? 'text-orange-400'
                : 'text-amber-400'
            }`}>
              {daysLeft <= 0 
                ? t('todayExpires') 
                : t('daysLeft').replace('{days}', String(daysLeft))}
            </span>
          )}

          {/* Row 3: Expiration Date (Bottom!) */}
          {benefit.expirationDate && (
            <span className="text-[9px] font-medium uppercase tracking-wider font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
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
        <div className="relative min-h-[36px]">
          {getBenefitDescription(benefit) && (
            <p className={`text-xs leading-relaxed pl-[38px] pr-12 pb-2.5 w-full text-left ${themeClass('text-slate-400', 'text-slate-500')}`}>
              {getBenefitDescription(benefit)}
            </p>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skipBenefit(logKey);
            }}
            className={`absolute bottom-[10px] right-0 p-1.5 rounded-lg transition active:scale-95 cursor-pointer z-10 ${
              isSkipped
                ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10'
                : themeClass('text-slate-500 hover:text-white hover:bg-white/5', 'text-slate-400 hover:text-slate-800 hover:bg-black/5')
            }`}
            title={isSkipped ? t('restore') : t('ignore')}
          >
            {isSkipped ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

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

          if (benefit.type === 'welcome-offer') {
            return (
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`p-4 mt-3 rounded-xl border flex flex-col gap-4 w-full transition-all duration-300 ${
                  themeClass(
                    'bg-purple-900/20 border-purple-700/30', 
                    'bg-purple-50/50 border-purple-200 shadow-sm'
                  )
                }`}
              >
                {/* Mission Header */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className={`text-2xl font-black font-mono leading-none ${themeClass('text-white', 'text-slate-900')}`}>
                      ${Math.max(limit - currentProgress, 0)}
                    </span>
                    <span className={`text-[10px] font-medium mt-1 leading-none ${themeClass('text-slate-400', 'text-slate-500')}`}>
                      {language === 'zh' ? `还需消费以拿满 $${benefit.value} 奖励` : `left to earn $${benefit.value} bonus`}
                    </span>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    <div className={`flex items-center rounded-lg border overflow-hidden text-xs ${
                      themeClass('border-purple-700/50 bg-slate-900/50', 'border-purple-200 bg-white shadow-sm')
                    }`}>
                      <button
                        type="button"
                        disabled={isExpired || isZeroProgress}
                        onClick={() => {
                          const newSpent = Math.max(currentProgress - step, 0);
                          updateProgressLog(logKey, newSpent);
                        }}
                        className={`px-2.5 py-1.5 text-[9px] font-black tracking-wider uppercase transition duration-150 select-none cursor-pointer active:scale-[0.92] ${
                          isZeroProgress || isExpired
                            ? 'opacity-35 cursor-not-allowed text-slate-500'
                            : themeClass('text-slate-300 hover:bg-purple-800/30', 'text-slate-600 hover:bg-purple-50')
                        }`}
                      >
                        -{step}
                      </button>
                      <div className={`flex items-center px-1.5 py-1.5 border-l border-r ${
                        themeClass('border-purple-700/50 bg-slate-900/25', 'border-purple-200 bg-purple-50/30')
                      }`}>
                        <span className="text-[9.5px] font-bold text-slate-500 mr-0.5">$</span>
                        <input
                          type="number"
                          disabled={isExpired}
                          value={currentProgress || ''}
                          onChange={(e) => updateProgressLog(logKey, Number(e.target.value))}
                          className={`w-16 border-0 p-0 text-center text-xs bg-transparent focus:outline-none font-mono font-black ${
                            themeClass('text-white', 'text-slate-800')
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isExpired || isFullyResolved}
                        onClick={() => {
                          const newSpent = Math.min(currentProgress + step, limit);
                          updateProgressLog(logKey, newSpent);
                        }}
                        className={`px-2.5 py-1.5 text-[9px] font-black tracking-wider uppercase transition duration-150 select-none cursor-pointer active:scale-[0.92] ${
                          isFullyResolved || isExpired
                            ? 'opacity-35 cursor-not-allowed text-slate-500'
                            : themeClass('text-purple-400 hover:bg-purple-800/30', 'text-purple-600 hover:bg-purple-50')
                        }`}
                      >
                        +{step}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    <span>{t('spent')}: ${currentProgress}</span>
                    <span>{language === 'zh' ? '目标' : 'Goal'}: ${limit}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500"
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div 
              onClick={(e) => e.stopPropagation()} // Prevent row click checklist toggle
              className={`p-3.5 sm:p-4 mt-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-5 w-full transition-all duration-300 ${
                themeClass(
                  'bg-slate-955/20 border-slate-850/45', 
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
                    title={`${t('reduce')} $${step}`}
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
                      className={`w-16 border-0 p-0 text-center text-xs bg-transparent focus:outline-none font-mono font-black ${
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
                    title={`${t('add')} $${step}`}
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
                      {ab.benefit.type === 'welcome-offer' ? (language === 'zh' ? '还差消费' : 'Need to Spend') : t('spent')}
                    </span>
                    <span className={`text-xs font-black font-mono mt-0.5 leading-none ${themeClass('text-slate-200', 'text-slate-750')}`}>
                      {ab.benefit.type === 'welcome-offer' 
                        ? `$${Math.max(limit - currentProgress, 0)}` 
                        : `$${currentProgress}`} 
                      <span className="text-[9.5px] font-medium text-slate-450 dark:text-slate-500">
                        {ab.benefit.type === 'welcome-offer' ? ` (${t('spent')}: $${currentProgress})` : `/ $${limit}`}
                      </span>
                    </span>
                  </div>

                  {/* Right: Cashback earned */}
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${themeClass('text-slate-455', 'text-slate-500')}`}>
                      {t('earned')}
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
