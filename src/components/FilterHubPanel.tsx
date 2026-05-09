import { Filter, CreditCard, ArrowUpDown } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';

interface FilterHubPanelProps {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  activeTab: string;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterCardInstanceId: string;
  setFilterCardInstanceId: (id: string) => void;
  sortBy: string;
  setSortBy: (sort: any) => void;
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
  if (activeTab === 'cards') return null;

  const showCardFilter = ownedCards.length > 0 || loyaltyAwards.length > 0;

  return (
    <div className={`grid grid-cols-1 ${showCardFilter ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 p-3 mb-6 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
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
          <option value="all">All Categories</option>
          {filterCardInstanceId === 'awards' ? (
            <>
              <option value="fnr">Free Night (FNA)</option>
              <option value="sua">Suite Upgrade (SUA)</option>
              <option value="goh">Guest of Honor (GOH)</option>
              <option value="companion">Companion Pass</option>
              <option value="swu">Systemwide Upgrade (SWU)</option>
              <option value="points">Points & Miles</option>
              <option value="other">Other Vouchers</option>
            </>
          ) : (
            <>
              <option value="dining">Dining</option>
              <option value="travel">Travel</option>
              <option value="shopping">Shopping</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
            </>
          )}
        </select>
      </div>

      {/* 2. Card & Vouchers Instance Filter */}
      {showCardFilter && (
        <div className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 text-xs transition ${
          themeClass('bg-slate-955/40 border-slate-850 hover:border-slate-800 text-slate-300', 'bg-slate-50/80 border-slate-250/60 hover:border-slate-300 text-slate-700')
        }`}>
          <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterCardInstanceId}
            onChange={(e) => setFilterCardInstanceId(e.target.value)}
            className="w-full bg-transparent outline-none border-none cursor-pointer font-semibold text-xs focus:ring-0"
          >
            <option value="all">All Portfolios</option>
            {loyaltyAwards.length > 0 && (
              <option value="awards">🎁 Standalone Vouchers</option>
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
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-full bg-transparent outline-none border-none cursor-pointer font-semibold text-xs focus:ring-0"
        >
          <option value="urgency">Sort: Urgency Score</option>
          <option value="expiry">Sort: Expiration Date</option>
          <option value="value-desc">Sort: Value (High ➔ Low)</option>
          <option value="value-asc">Sort: Value (Low ➔ High)</option>
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
          {isGroupedView ? '🗂️ Wallet View' : '📋 List View'}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase ${
          themeClass('bg-slate-955 text-purple-400', 'bg-white text-purple-600 border border-slate-200')
        }`}>
          {isGroupedView ? 'Grouped' : 'Flat'}
        </span>
      </button>
    </div>
  );
}
