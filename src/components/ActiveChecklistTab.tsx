import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { FilterHubPanel } from './FilterHubPanel';
import { ChecklistCardRow } from './ChecklistCardRow';
import { AWARD_TEMPLATES, CARDS_DB } from '../data/cards.db';
import type { LoyaltyAward } from '../data/cards.db';
import { getDaysLeft, getDaysLeftForDate, getUrgencyScore } from '../utils/dateUtils';
import type { ActiveBenefit } from '../utils/dateUtils';
import type { OwnedCardInstance } from '../store/useCardStore';
import { obfuscateKey } from '../utils/cryptoUtils';
import { parseLogEntry } from '../utils/logUtils';
import type { LogEntry } from '../utils/logUtils';
import { useCardStore } from '../store/useCardStore';
import { translations, formatCardName } from '../utils/i18n';

interface ActiveChecklistTabProps {
  activeBenefits: ActiveBenefit[];
  logs: Record<string, LogEntry>;
  currentDate: Date;
  activeTab: 'todo' | 'cards';
  themeClass: (dark: string, light: string) => string;
  updateProgressLog: (key: string, spent: number) => void;
  toggleBenefit: (key: string) => void;
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  isGroupedView: boolean;
  setIsGroupedView: (grouped: boolean) => void;
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function ActiveChecklistTab({
  activeBenefits,
  logs,
  currentDate,
  activeTab,
  themeClass,
  updateProgressLog,
  toggleBenefit,
  ownedCards,
  loyaltyAwards,
  isGroupedView,
  setIsGroupedView,
  collapsedGroups,
  setCollapsedGroups
}: ActiveChecklistTabProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCardInstanceId, setFilterCardInstanceId] = useState('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'expiry' | 'value-desc' | 'value-asc'>('urgency');
  const [isClaimedCollapsed, setIsClaimedCollapsed] = useState(true);
  const [isExpiredCollapsed, setIsExpiredCollapsed] = useState(true);
  const [isSkippedCollapsed, setIsSkippedCollapsed] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Core helper to evaluate benefit expiration dynamically in sandbox
  const isBenefitExpired = (ab: ActiveBenefit): boolean => {
    if (ab.loyaltyAward) {
      return !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate;
    }
    return ab.benefit.resetPeriod === 'fixed' && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate;
  };

  // 1. Master search/category filter
  const filteredBenefits = activeBenefits.filter((ab) => {
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

  // 2. Sort filtered benefits list
  const sortedBenefits = [...filteredBenefits].sort((a, b) => {
    if (a.isUsed !== b.isUsed) {
      return a.isUsed ? 1 : -1;
    }

    switch (sortBy) {
      case 'value-desc':
        return b.benefit.value - a.benefit.value;
      case 'value-asc':
        return a.benefit.value - b.benefit.value;
      case 'expiry': {
        const daysA = a.loyaltyAward
          ? (a.benefit.expirationDate ? getDaysLeftForDate(a.benefit.expirationDate, currentDate) : 9999)
          : (getDaysLeft(a, currentDate) ?? 9999);
        const daysB = b.loyaltyAward
          ? (b.benefit.expirationDate ? getDaysLeftForDate(b.benefit.expirationDate, currentDate) : 9999)
          : (getDaysLeft(b, currentDate) ?? 9999);
        return daysA - daysB;
      }
      case 'urgency':
      default:
        return getUrgencyScore(a, currentDate) - getUrgencyScore(b, currentDate);
    }
  });

  // Helper to check if a benefit is skipped
  const isBenefitSkipped = (ab: ActiveBenefit): boolean => {
    const logEntry = logs[obfuscateKey(ab.logKey)];
    const parsed = parseLogEntry(logEntry);
    return !!(parsed && parsed.skipped);
  };

  // 3. Partition sorted benefits into 4 distinct groups
  const activeItems = sortedBenefits.filter((ab) => !ab.isUsed && !isBenefitExpired(ab) && !isBenefitSkipped(ab));
  const claimedItems = sortedBenefits.filter((ab) => ab.isUsed);
  const expiredItems = sortedBenefits.filter((ab) => !ab.isUsed && isBenefitExpired(ab));
  const skippedItems = sortedBenefits.filter((ab) => !ab.isUsed && !isBenefitExpired(ab) && isBenefitSkipped(ab));

  const renderBenefitRow = (ab: ActiveBenefit) => {
    const isExpired = isBenefitExpired(ab);
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
        toggleBenefit={toggleBenefit}
        updateProgressLog={updateProgressLog}
        themeClass={themeClass}
        isGrouped={isGroupedView}
      />
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Action Bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-grow">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
            themeClass('text-slate-500', 'text-slate-400')
          }`} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all duration-300 ${
              themeClass('bg-slate-955 border-slate-850 text-slate-200 placeholder-slate-550 focus:border-purple-500', 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500 shadow-sm')
            }`}
          />
        </div>

        <button
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition duration-200 active:scale-95 shrink-0 cursor-pointer select-none sm:hidden ${
            isFiltersExpanded
              ? 'bg-purple-600 text-white border-transparent shadow-md shadow-purple-600/20'
              : themeClass(
                  'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300',
                  'bg-white hover:bg-slate-50 border-slate-250 text-slate-750 shadow-sm'
                )
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>{t('filters')}</span>
        </button>
      </div>

      {/* Dynamic Filters Panel (Collapsible on Mobile, Always Open on Desktop) */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isFiltersExpanded 
          ? 'max-h-[320px] opacity-100 pointer-events-auto' 
          : 'max-h-0 opacity-0 pointer-events-none max-sm:mb-0'
      } sm:max-h-[200px] sm:opacity-100 sm:pointer-events-auto`}>
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
      </div>

      <div className="space-y-4">
        {/* A. ACTIVE ITEMS VIEW BLOCK */}
        {activeItems.length === 0 ? (
          <div className={`p-8 rounded-2xl text-center border border-dashed max-w-md mx-auto ${
            themeClass('border-slate-850 bg-slate-950/20', 'border-slate-250 bg-slate-50/50')
          }`}>
            <p className="text-xl">🎯</p>
            <h4 className={`text-xs font-bold mt-2 ${themeClass('text-slate-300', 'text-slate-700')}`}>{t('allClaimed')}</h4>
            <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-455', 'text-slate-500')}`}>
              {t('noPending')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Active Items List render flat/grouped */}
            {!isGroupedView ? (
              <div className="space-y-3">
                {activeItems.map(renderBenefitRow)}
              </div>
            ) : (() => {
              const grouped = activeItems.reduce((acc, ab) => {
                const key = ab.cardInstance ? ab.cardInstance.id : 'awards';
                if (!acc[key]) acc[key] = [];
                acc[key].push(ab);
                return acc;
              }, {} as Record<string, typeof activeItems>);

              return (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([key, items]) => {
                    const isAwards = key === 'awards';
                    const card = !isAwards ? ownedCards.find((c) => c.id === key) : null;
                    if (!isAwards && !card) return null;

                    const template = card && card.templateId !== 'custom'
                      ? CARDS_DB.find((t) => t.id === card.templateId)
                      : null;

                    const isCollapsed = !!collapsedGroups[key];

                    return (
                      <div 
                        key={key}
                        className={`border rounded-2xl overflow-hidden transition duration-200 shadow-sm ${
                          themeClass('bg-slate-900/20 border-slate-850/60', 'bg-white border-slate-200')
                        } border-l-[4px] ${
                          isAwards 
                            ? 'border-l-purple-500' 
                            : (card?.color ? `border-l-${card.color.split(' ')[0].replace('from-', '')}` : 'border-l-slate-500')
                        }`}
                      >
                        {/* Collapsible Section Card Header */}
                        <div
                          onClick={() => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={`flex items-center justify-between p-3 cursor-pointer select-none border-b transition-colors duration-200 ${
                            themeClass(
                              'bg-slate-900/40 border-slate-950 hover:bg-slate-900/60 text-slate-200',
                              'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                            )
                          }`}
                        >
                           <div className="flex items-center gap-2.5 min-w-0">
                            {(() => {
                              if (isAwards) {
                                return (
                                  <span className="text-[11px] font-black uppercase tracking-wider truncate">
                                    {t('standaloneVouchers')}
                                  </span>
                                );
                              }

                              if (!card) return null;

                              const typeName = template ? formatCardName(template.name) : (card.bank || 'Card');
                              const customName = card.customName ? card.customName.trim() : '';

                              const isDuplicated = !customName || customName === typeName || (template && customName === template.name);

                              if (isDuplicated) {
                                return (
                                  <span className="text-[11px] font-black uppercase tracking-wider truncate">
                                    {typeName}
                                  </span>
                                );
                              }

                              // Typographic Split Duet for Collapsible Card Drawer Header in Zen Mode!
                              return (
                                <div className="flex items-baseline gap-1 truncate select-none">
                                  <span className={`text-[11.5px] font-black tracking-wide ${themeClass('text-slate-200', 'text-slate-800')}`}>
                                    {customName}
                                  </span>
                                  <span className={`text-[9px] mx-1.5 font-light select-none ${themeClass('text-slate-700', 'text-slate-300')}`}>
                                    │
                                  </span>
                                  <span className={`text-[9.5px] font-bold tracking-wider uppercase ${themeClass('text-slate-500', 'text-slate-450')}`}>
                                    {typeName}
                                  </span>
                                </div>
                              );
                            })()}
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-wide shrink-0 ${
                              themeClass('bg-slate-800 text-slate-400 border border-slate-750', 'bg-slate-200/65 text-slate-600 border border-slate-250')
                            }`}>
                              {`${items.length} ${t('pendingBadge')}`}
                            </span>
                          </div>
                          <span className={`text-[9px] font-extrabold opacity-75 px-1.5 uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
                            {isCollapsed ? t('expand') : t('collapse')}
                          </span>
                        </div>

                        {/* Group checklist rows */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          isCollapsed 
                            ? 'max-h-0 opacity-0 pointer-events-none' 
                            : 'max-h-[1200px] opacity-100 p-3 space-y-2.5'
                        } ${themeClass('bg-slate-955/20', 'bg-white/50')}`}>
                          {items.map(renderBenefitRow)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* B. EXPIRED ITEMS ARCHIVE COLLAPSED BOX */}
        {expiredItems.length > 0 && (
          <div className={`border rounded-2xl overflow-hidden transition duration-250 ${
            themeClass('bg-slate-900/10 border-slate-850/60 shadow-black/5', 'bg-slate-50/30 border-slate-250 shadow-slate-500/5')
          }`}>
            <div
              onClick={() => setIsExpiredCollapsed(!isExpiredCollapsed)}
              className={`flex items-center justify-between p-3 cursor-pointer select-none border-b ${
                themeClass('bg-slate-955/50 border-slate-900/40 text-red-400', 'bg-red-50/30 border-slate-200/40 text-red-600')
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider truncate">
                  {t('expiredArchive')} ({expiredItems.length} {t('itemsSuffix')})
                </span>
              </div>
              <span className="text-[9px] font-black opacity-80 px-1.5">
                {isExpiredCollapsed ? t('expand') : t('collapse')}
              </span>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpiredCollapsed 
                ? 'max-h-0 opacity-0 pointer-events-none' 
                : 'max-h-[1200px] opacity-100 p-3 space-y-2.5'
            } ${themeClass('bg-slate-955/10', 'bg-white/30')}`}>
              {expiredItems.map(renderBenefitRow)}
            </div>
          </div>
        )}

        {/* Skipped Items Archive */}
        {skippedItems.length > 0 && (
          <div className={`border rounded-2xl overflow-hidden transition duration-250 ${
            themeClass('bg-slate-900/10 border-slate-850/60 shadow-black/5', 'bg-slate-50/30 border-slate-250 shadow-slate-500/5')
          }`}>
            <div
              onClick={() => setIsSkippedCollapsed(!isSkippedCollapsed)}
              className={`flex items-center justify-between p-3 cursor-pointer select-none border-b ${
                themeClass('bg-slate-955/50 border-slate-900/40 text-slate-400', 'bg-slate-100/30 border-slate-200/40 text-slate-600')
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider truncate">
                  {language === 'zh' ? '已忽略的本期福利' : 'Skipped Perks Archive'} ({skippedItems.length})
                </span>
              </div>
              <span className="text-[9px] font-black opacity-80 px-1.5">
                {isSkippedCollapsed ? (language === 'zh' ? '展开' : 'Expand') : (language === 'zh' ? '收起' : 'Collapse')}
              </span>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isSkippedCollapsed 
                ? 'max-h-0 opacity-0 pointer-events-none' 
                : 'max-h-[1200px] opacity-100 p-3 space-y-2.5'
            } ${themeClass('bg-slate-955/10', 'bg-white/30')}`}>
              {skippedItems.map(renderBenefitRow)}
            </div>
          </div>
        )}

        {/* C. CLAIMED / RESOLVED ITEMS ARCHIVE COLLAPSED BOX */}
        {claimedItems.length > 0 && (
          <div className={`border rounded-2xl overflow-hidden transition duration-250 ${
            themeClass('bg-slate-900/10 border-slate-850/60 shadow-black/5', 'bg-slate-50/30 border-slate-250 shadow-slate-500/5')
          }`}>
            <div
              onClick={() => setIsClaimedCollapsed(!isClaimedCollapsed)}
              className={`flex items-center justify-between p-3 cursor-pointer select-none border-b ${
                themeClass('bg-slate-955/50 border-slate-900/40 text-slate-400', 'bg-slate-100/30 border-slate-200/40 text-slate-600')
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider truncate">
                  {t('claimedArchive')} ({claimedItems.length} {t('claimedSuffix')})
                </span>
              </div>
              <span className="text-[9px] font-black opacity-80 px-1.5">
                {isClaimedCollapsed ? t('expand') : t('collapse')}
              </span>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isClaimedCollapsed 
                ? 'max-h-0 opacity-0 pointer-events-none' 
                : 'max-h-[1200px] opacity-100 p-3 space-y-2.5'
            } ${themeClass('bg-slate-955/10', 'bg-white/30')}`}>
              {claimedItems.map(renderBenefitRow)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
