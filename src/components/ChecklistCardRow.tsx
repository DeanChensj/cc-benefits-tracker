import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ActiveBenefit } from '../utils/dateUtils';
import type { LogEntry } from '../utils/logUtils';
import { parseLogEntry } from '../utils/logUtils';
import { obfuscateKey } from '../utils/cryptoUtils';
import { AWARD_TEMPLATES } from '../data/cards.db';
import { getStepAmount } from '../utils/valuationUtils';

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
  const { cardInstance, benefit, logKey, isUsed, loyaltyAward } = ab;
  const isStandalone = !cardInstance;
  const badgeText = isStandalone
    ? (loyaltyAward ? (AWARD_TEMPLATES[loyaltyAward.templateId]?.brand || loyaltyAward.customBrand || 'Award') : 'Award')
    : cardInstance.customName;

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
          : themeClass('bg-slate-900/40 border-slate-850/80 hover:border-slate-700 hover:bg-slate-900 cursor-pointer', 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer shadow-[0_2px_6px_rgba(15,23,42,0.02)] hover:shadow-[0_4px_10px_rgba(15,23,42,0.045)]')
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
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold truncate ${
              isExpired ? 'text-slate-400 line-through' :
              isUsed ? 'line-through text-slate-450' : themeClass('text-slate-100', 'text-slate-800')
            }`}>
              {benefit.name}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wide border shrink-0 ${
              isStandalone
                ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/5 shadow-sm'
                : themeClass('bg-slate-800 text-slate-300 border-slate-700', 'bg-slate-100 text-slate-600 border-slate-200')
            }`}>
              {badgeText}
            </span>
            <span className={`text-[9px] pl-1.5 pr-2 py-0.5 rounded-md font-bold tracking-wide border shrink-0 flex items-center gap-1 ${
              themeClass('bg-slate-955/30 text-slate-400 border-slate-850', 'bg-slate-50 text-slate-550 border-slate-200')
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                benefit.category === 'dining' ? 'bg-rose-500 animate-pulse' :
                benefit.category === 'travel' ? 'bg-sky-500' :
                benefit.category === 'shopping' ? 'bg-emerald-500' :
                benefit.category === 'entertainment' ? 'bg-purple-500' : 'bg-slate-400'
              }`} />
              <span className="uppercase tracking-wider text-[8px]">{benefit.category}</span>
            </span>
            
            {isExpired ? (
              <span className="text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.2 rounded shrink-0">Expired</span>
            ) : !isUsed && daysLeft !== null && (
              <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded shrink-0 ${
                daysLeft <= 5 
                  ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' 
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}>
                {daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft}d`}
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
                  <span>Spent: ${spent} / ${benefit.spendingLimit} ({Math.round(spentPercent)}%)</span>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-450">
                  <span>Spent: ${spent} / ${benefit.spendingLimit} ({Math.round(spentPercent)}%)</span>
                  <span className={isUsed ? 'text-emerald-500 dark:text-emerald-400' : ''}>
                    Cashback: ${cashbackEarned} / ${benefit.value}
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
            {benefit.resetPeriod === 'monthly' ? 'Monthly' :
             benefit.resetPeriod === 'quarterly' ? 'Quarterly' :
             benefit.resetPeriod === 'semi-annual' ? 'Semi-Annual' :
             benefit.resetPeriod === 'annual-calendar' ? 'Annual (Cal)' :
             benefit.resetPeriod === 'annual-anniversary' ? 'Annual (Anniv)' : 'Fixed Expir'}
          </span>
        </div>
      </div>
    </div>
  );
});
