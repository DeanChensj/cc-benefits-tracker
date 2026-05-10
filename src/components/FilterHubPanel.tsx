import { Filter, CreditCard, ArrowUpDown } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface FilterHubPanelProps {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  activeTab: string;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterCardInstanceId: string;
  setFilterCardInstanceId: (id: string) => void;
  sortBy: string;
  setSortBy: (sort: 'urgency' | 'expiry' | 'value-desc' | 'value-asc') => void;
  themeClass: (dark: string, light: string) => string;
  isGroupedView: boolean;
  setIsGroupedView: (isGrouped: boolean) => void;
}

export function FilterHubPanel({
  ownedCards,
  loyaltyAwards,
  activeTab,
  filterCategory,
  setFilterCategory,
  filterCardInstanceId,
  setFilterCardInstanceId,
  sortBy,
  setSortBy,
  themeClass,
  isGroupedView,
  setIsGroupedView,
}: FilterHubPanelProps) {
  const language = useCardStore((state) => state.language);
  
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  if (activeTab === 'cards') return null;

  const showCardFilter = ownedCards.length > 0 || loyaltyAwards.length > 0;

  return (
    <div className={`grid grid-cols-1 ${showCardFilter ? 'sm:grid-cols-[1fr_1.3fr_1fr_1fr]' : 'sm:grid-cols-3'} gap-3 p-3 mb-6 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
      themeClass(
        'bg-slate-900/30 border-slate-900/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
        'bg-white/70 border-slate-200/80 shadow-[0_8px_20px_rgba(15,23,42,0.035)]'
      )
    }`}>
      {/* 1. Category Filter */}
      <div className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 text-xs transition ${
        themeClass('bg-slate-955/40 border-slate-850 hover:border-slate-800 text-slate-300', 'bg-slate-50/80 border-slate-250/60 hover:border-slate-300 text-slate-700')
      }`}>
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full bg-transparent outline-none border-none cursor-pointer font-semibold text-xs focus:ring-0"
        >
          <option value="all">{t('allCategories')}</option>
          {filterCardInstanceId === 'awards' ? (
            <>
              <option value="fnr">{t('awardFnr')}</option>
              <option value="sua">{t('awardSua')}</option>
              <option value="goh">{t('awardGoh')}</option>
              <option value="companion">{t('awardCompanion')}</option>
              <option value="swu">{t('awardSwu')}</option>
              <option value="points">{t('awardPoints')}</option>
              <option value="other">{t('awardOther')}</option>
            </>
          ) : (
            <>
              <option value="dining">{t('catDining')}</option>
              <option value="travel">{t('catTravel')}</option>
              <option value="shopping">{t('catShopping')}</option>
              <option value="entertainment">{t('catEntertainment')}</option>
              <option value="other">{t('catOther')}</option>
            </>
          )}
        </select>
      </div>

      {/* 2. Card & Vouchers Instance Filter */}
      {showCardFilter && (
        <div 
          title={filterCardInstanceId === 'all' ? t('allPortfolios') : filterCardInstanceId === 'awards' ? t('standaloneVouchers') : (ownedCards.find(c => c.id === filterCardInstanceId)?.customName || '')}
          className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 text-xs transition ${
            themeClass('bg-slate-955/40 border-slate-850 hover:border-slate-800 text-slate-300', 'bg-slate-50/80 border-slate-250/60 hover:border-slate-300 text-slate-700')
          }`}
        >
          <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterCardInstanceId}
            onChange={(e) => setFilterCardInstanceId(e.target.value)}
            className="w-full bg-transparent outline-none border-none cursor-pointer font-semibold text-xs focus:ring-0 truncate pr-6"
          >
            <option value="all">{t('allPortfolios')}</option>
            {loyaltyAwards.length > 0 && (
              <option value="awards">{t('standaloneVouchers')}</option>
            )}
            {ownedCards.map((card) => (
              <option key={card.id} value={card.id}>
                💳 {card.customName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Sort Selector */}
      <div className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 text-xs transition ${
        themeClass('bg-slate-955/40 border-slate-850 hover:border-slate-800 text-slate-300', 'bg-slate-50/80 border-slate-250/60 hover:border-slate-300 text-slate-700')
      }`}>
        <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'urgency' | 'expiry' | 'value-desc' | 'value-asc')}
          className="w-full bg-transparent outline-none border-none cursor-pointer font-semibold text-xs focus:ring-0"
        >
          <option value="urgency">{t('sortUrgency')}</option>
          <option value="expiry">{t('sortExpiry')}</option>
          <option value="value-desc">{t('sortValueDesc')}</option>
          <option value="value-asc">{t('sortValueAsc')}</option>
        </select>
      </div>

      {/* 4. View Mode Toggler */}
      <button
        onClick={() => setIsGroupedView(!isGroupedView)}
        className={`flex items-center justify-between border rounded-xl px-3 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer select-none gap-2 ${
          themeClass(
            'bg-slate-955/40 border-slate-850 hover:border-slate-800 text-slate-300 hover:text-white', 
            'bg-slate-50/80 border-slate-250/60 hover:border-slate-300 text-slate-750 shadow-sm'
          )
        }`}
      >
        <span className="truncate flex items-center gap-1.5">
          {isGroupedView ? t('walletView') : t('listView')}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase ${
          themeClass('bg-slate-955 text-purple-400', 'bg-white text-purple-600 border border-slate-200')
        }`}>
          {isGroupedView ? t('groupedBadge') : t('flatBadge')}
        </span>
      </button>
    </div>
  );
}
