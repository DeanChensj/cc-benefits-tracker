import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { FilterHubPanel } from './FilterHubPanel';
import { ChecklistCardRow } from './ChecklistCardRow';
import { AWARD_TEMPLATES, CARDS_DB } from '../data/cards.db';
import type { LoyaltyAward } from '../data/cards.db';
import { getDaysLeft, getDaysLeftForDate, getUrgencyScore } from '../utils/dateUtils';
import type { ActiveBenefit } from '../utils/dateUtils';
import type { OwnedCardInstance } from '../store/useCardStore';
import { obfuscateKey } from '../utils/cryptoUtils';
import { parseLogEntry } from '../utils/logUtils';

interface ActiveChecklistTabProps {
  activeBenefits: ActiveBenefit[];
  logs: Record<string, any>;
  currentDate: Date;
  activeTab: 'todo' | 'all';
  themeClass: (dark: string, light: string) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  updateProgressLog: (key: string, spent: number) => void;
  toggleBenefit: (key: string) => void;
  toggleLoyaltyAward: (key: string) => void;
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  isGroupedView: boolean;
  setIsGroupedView: (grouped: boolean) => void;
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function ActiveChecklistTab({
  activeBenefits,
  logs,
  currentDate,
  activeTab,
  themeClass,
  showToast,
  updateProgressLog,
  toggleBenefit,
  toggleLoyaltyAward,
  ownedCards,
  loyaltyAwards,
  isGroupedView,
  setIsGroupedView,
  collapsedGroups,
  setCollapsedGroups
}: ActiveChecklistTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCardInstanceId, setFilterCardInstanceId] = useState('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'expiry' | 'value-desc' | 'value-asc'>('urgency');

  const handleToggleBenefit = useCallback((key: string) => {
    const ab = activeBenefits.find(b => b.logKey === key);
    if (ab?.loyaltyAward) {
      toggleLoyaltyAward(key);
    } else {
      toggleBenefit(key);
    }
  }, [activeBenefits, toggleBenefit, toggleLoyaltyAward]);

  // Filtered benefits for view
  const filteredBenefits = activeBenefits.filter((ab) => {
    if (activeTab === 'todo' && ab.isUsed) return false;

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const cardLabel = ab.cardInstance
        ? ab.cardInstance.customName.toLowerCase()
        : (ab.loyaltyAward ? (AWARD_TEMPLATES[ab.loyaltyAward.templateId]?.brand || ab.loyaltyAward.customBrand || 'Award').toLowerCase() : 'award');
      const perkName = ab.benefit.name.toLowerCase();
      if (!cardLabel.includes(query) && !perkName.includes(query)) return false;
    }

    if (filterCategory !== 'all') {
      if (filterCardInstanceId === 'awards') {
        if (!ab.loyaltyAward) return false;
        const awardType = ab.loyaltyAward.templateId === 'custom'
          ? (ab.loyaltyAward.customAwardType || 'other')
          : (AWARD_TEMPLATES[ab.loyaltyAward.templateId]?.awardType || 'other');
        if (awardType !== filterCategory) return false;
      } else {
        if (ab.benefit.category !== filterCategory) return false;
      }
    }
    if (filterCardInstanceId !== 'all') {
      if (filterCardInstanceId === 'awards') {
        if (!ab.loyaltyAward) return false;
      } else {
        if (!ab.cardInstance || ab.cardInstance.id !== filterCardInstanceId) return false;
      }
    }
    return true;
  });

  // Sorted benefits
  const sortedBenefits = [...filteredBenefits].sort((a, b) => {
    if (a.isUsed !== b.isUsed) {
      return a.isUsed ? 1 : -1;
    }

    switch (sortBy) {
      case 'value-desc':
        return b.benefit.value - a.benefit.value;
      case 'value-asc':
        return a.benefit.value - b.benefit.value;
      case 'expiry':
        const daysA = a.loyaltyAward
          ? (a.benefit.expirationDate ? getDaysLeftForDate(a.benefit.expirationDate, currentDate) : 9999)
          : (getDaysLeft(a, currentDate) ?? 9999);
        const daysB = b.loyaltyAward
          ? (b.benefit.expirationDate ? getDaysLeftForDate(b.benefit.expirationDate, currentDate) : 9999)
          : (getDaysLeft(b, currentDate) ?? 9999);
        return daysA - daysB;
      case 'urgency':
      default:
        return getUrgencyScore(a, currentDate) - getUrgencyScore(b, currentDate);
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dynamic Filters Panel */}
      <FilterHubPanel
        ownedCards={ownedCards}
        loyaltyAwards={loyaltyAwards}
        activeTab={activeTab}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterCardInstanceId={filterCardInstanceId}
        setFilterCardInstanceId={setFilterCardInstanceId}
        sortBy={sortBy}
        setSortBy={setSortBy}
        themeClass={themeClass}
        isGroupedView={isGroupedView}
        setIsGroupedView={setIsGroupedView}
      />

      {/* Native Search Box */}
      <div className="relative">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
          themeClass('text-slate-500', 'text-slate-400')
        }`} />
        <input
          type="text"
          placeholder="Search by card name, bank, or perk details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all duration-300 ${
            themeClass('bg-slate-950 border-slate-850 text-slate-200 placeholder-slate-550 focus:border-purple-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500 shadow-sm')
          }`}
        />
      </div>

      {sortedBenefits.length === 0 ? (
        <div className={`p-8 rounded-2xl text-center border border-dashed max-w-md mx-auto ${
          themeClass('border-slate-850 bg-slate-950/20', 'border-slate-250 bg-slate-50/50')
        }`}>
          <p className="text-xl">🎯</p>
          <h4 className={`text-xs font-bold mt-2 ${themeClass('text-slate-300', 'text-slate-700')}`}>All benefits claimed!</h4>
          <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-450', 'text-slate-500')}`}>
            No pending cycles active in this filter combination.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick-Action Monthly Repeating Shelf */}
          {(() => {
            const quickMonthlyBenefits = activeBenefits.filter((ab) => {
              if (ab.isUsed) return false;
              return ab.benefit.resetPeriod === 'monthly';
            });

            if (quickMonthlyBenefits.length === 0) return null;

            return (
              <div className="mb-4 animate-fade-in">
                <h4 className={`text-[9px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                  themeClass('text-slate-400', 'text-slate-500')
                }`}>
                  <span className="animate-pulse text-purple-400">⚡</span>
                  Quick-Log Monthly Credits
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-4 px-4">
                  {quickMonthlyBenefits.map((ab) => {
                    const cardLabel = ab.cardInstance 
                      ? ab.cardInstance.customName 
                      : (ab.loyaltyAward ? (AWARD_TEMPLATES[ab.loyaltyAward.templateId]?.brand || ab.loyaltyAward.customBrand || 'Award') : 'Award');
                    
                    const emoji = ab.benefit.category === 'dining' ? '🍽️' :
                      ab.benefit.category === 'travel' ? '✈️' :
                      ab.benefit.category === 'shopping' ? '🛍️' :
                      ab.benefit.category === 'entertainment' ? '🎭' : '💳';

                    return (
                      <button
                        key={ab.logKey}
                        onClick={() => {
                          if (ab.benefit.spendingLimit) {
                            updateProgressLog(ab.logKey, ab.benefit.spendingLimit);
                          } else {
                            toggleBenefit(ab.logKey);
                          }
                          showToast(`🎉 Claimed $${ab.benefit.value} ${ab.benefit.name}!`);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition active:scale-95 hover:scale-[1.01] duration-200 cursor-pointer shrink-0 shadow-sm ${
                          themeClass('bg-slate-900/50 hover:bg-slate-900 border-slate-850 text-slate-200 hover:border-purple-900/30', 'bg-white hover:bg-slate-50 border-slate-200 text-slate-750 hover:border-purple-200')
                        }`}
                      >
                        <div className="text-xs shrink-0">{emoji}</div>
                        <div className="min-w-0 max-w-[120px]">
                          <p className={`text-[7px] font-bold uppercase tracking-wide truncate opacity-70`}>{cardLabel}</p>
                          <p className="text-[9px] font-extrabold truncate mt-0.5">{ab.benefit.name}</p>
                        </div>
                        <div className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-lg shrink-0 ml-1 ${
                          themeClass('bg-purple-500/10 text-purple-400 border border-purple-500/20', 'bg-purple-50 text-purple-600 border border-purple-200')
                        }`}>
                          ${ab.benefit.value}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {!isGroupedView ? (
            <div className="space-y-3">
              {sortedBenefits.map((ab) => {
                const isExpired = ab.loyaltyAward 
                  ? (!ab.isUsed && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate)
                  : (!ab.isUsed && ab.benefit.resetPeriod === 'fixed' && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate);

                const daysLeft = ab.loyaltyAward
                  ? (ab.benefit.expirationDate ? getDaysLeftForDate(ab.benefit.expirationDate, currentDate) : null)
                  : getDaysLeft(ab, currentDate);

                const isProgressive = !!ab.benefit.spendingLimit;
                const logEntry = logs[obfuscateKey(ab.logKey)];
                const parsed = parseLogEntry(logEntry);
                const spent = isProgressive ? (parsed?.spentProgress || 0) : 0;
                const spentPercent = isProgressive ? Math.min((spent / (ab.benefit.spendingLimit || 1)) * 100, 100) : 0;
                const cashbackEarned = isProgressive ? Math.round((ab.benefit.value * Math.min(spent / (ab.benefit.spendingLimit || 1), 1)) * 100) / 100 : 0;

                return (
                  <ChecklistCardRow
                    key={ab.logKey}
                    ab={ab}
                    logs={logs}
                    daysLeft={daysLeft}
                    isExpired={isExpired}
                    isProgressive={isProgressive}
                    spent={spent}
                    spentPercent={spentPercent}
                    cashbackEarned={cashbackEarned}
                    toggleBenefit={handleToggleBenefit}
                    updateProgressLog={updateProgressLog}
                    themeClass={themeClass}
                  />
                );
              })}
            </div>
          ) : (() => {
            const grouped = sortedBenefits.reduce((acc, ab) => {
              const key = ab.cardInstance ? ab.cardInstance.id : 'awards';
              if (!acc[key]) acc[key] = [];
              acc[key].push(ab);
              return acc;
            }, {} as Record<string, typeof sortedBenefits>);

            return (
              <div className="space-y-4">
                {Object.entries(grouped).map(([key, items]) => {
                  const isAwards = key === 'awards';
                  const card = !isAwards ? ownedCards.find((c) => c.id === key) : null;
                  if (!isAwards && !card) return null;

                  const template = card && card.templateId !== 'custom'
                    ? CARDS_DB.find((t) => t.id === card.templateId)
                    : null;

                  const cardName = isAwards 
                    ? '🎁 Standalone Vouchers' 
                    : (card?.customName || template?.name || 'Credit Card');

                  const brandColor = isAwards 
                    ? 'from-purple-600 to-indigo-800 text-white'
                    : (card?.color || template?.color || 'from-slate-600 to-slate-800 text-white');

                  const isCollapsed = !!collapsedGroups[key];
                  const resolvedCount = items.filter(ab => ab.isUsed).length;
                  const totalCount = items.length;

                  return (
                    <div 
                      key={key}
                      className={`border rounded-2xl overflow-hidden transition duration-200 ${
                        themeClass('bg-slate-900/10 border-slate-850/60', 'bg-slate-50/30 border-slate-200')
                      }`}
                    >
                      {/* Collapsible Section Card Header */}
                      <div
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`flex items-center justify-between p-3 cursor-pointer select-none bg-gradient-to-r ${brandColor} text-white border-b ${
                          themeClass('border-slate-900/40', 'border-slate-200/40')
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold truncate">{cardName}</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wide shrink-0 bg-white/20 text-white`}>
                            {activeTab === 'todo' 
                              ? `${items.length} Active` 
                              : `${resolvedCount}/${totalCount} Done`}
                          </span>
                        </div>
                        <span className="text-[9px] font-black opacity-80 px-1.5">
                          {isCollapsed ? '▶ Expand' : '▼ Collapse'}
                        </span>
                      </div>

                      {/* Group checklist rows */}
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isCollapsed 
                          ? 'max-h-0 opacity-0 pointer-events-none' 
                          : 'max-h-[1200px] opacity-100 p-3 space-y-2.5'
                      } ${themeClass('bg-slate-955/20', 'bg-white/50')}`}>
                        {items.map((ab) => {
                          const isExpired = ab.loyaltyAward 
                            ? (!ab.isUsed && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate)
                            : (!ab.isUsed && ab.benefit.resetPeriod === 'fixed' && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate);

                          const daysLeft = ab.loyaltyAward
                            ? (ab.benefit.expirationDate ? getDaysLeftForDate(ab.benefit.expirationDate, currentDate) : null)
                            : getDaysLeft(ab, currentDate);

                          const isProgressive = !!ab.benefit.spendingLimit;
                          const logEntry = logs[obfuscateKey(ab.logKey)];
                          const parsed = parseLogEntry(logEntry);
                          const spent = isProgressive ? (parsed?.spentProgress || 0) : 0;
                          const spentPercent = isProgressive ? Math.min((spent / (ab.benefit.spendingLimit || 1)) * 100, 100) : 0;
                          const cashbackEarned = isProgressive ? Math.round((ab.benefit.value * Math.min(spent / (ab.benefit.spendingLimit || 1), 1)) * 100) / 100 : 0;

                          return (
                            <ChecklistCardRow
                              key={ab.logKey}
                              ab={ab}
                              logs={logs}
                              daysLeft={daysLeft}
                              isExpired={isExpired}
                              isProgressive={isProgressive}
                              spent={spent}
                              spentPercent={spentPercent}
                              cashbackEarned={cashbackEarned}
                              toggleBenefit={handleToggleBenefit}
                              updateProgressLog={updateProgressLog}
                              themeClass={themeClass}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
