import { Filter, CreditCard, ArrowUpDown } from 'lucide-react';
import type { OwnedCardInstance } from '../store/useCardStore';

interface FilterHubPanelProps {
  ownedCards: OwnedCardInstance[];
  activeTab: string;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterCardInstanceId: string;
  setFilterCardInstanceId: (id: string) => void;
  sortBy: string;
  setSortBy: (sort: any) => void;
  themeClass: (dark: string, light: string) => string;
}

export function FilterHubPanel({
  ownedCards,
  activeTab,
  filterCategory,
  setFilterCategory,
  filterCardInstanceId,
  setFilterCardInstanceId,
  sortBy,
  setSortBy,
  themeClass,
}: FilterHubPanelProps) {
  if (activeTab === 'cards') return null;

  return (
    <div className={`grid grid-cols-1 ${ownedCards.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 p-3 mb-6 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
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
          <option value="dining">Dining</option>
          <option value="travel">Travel</option>
          <option value="shopping">Shopping</option>
          <option value="entertainment">Entertainment</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* 2. Card Instance Filter */}
      {ownedCards.length > 0 && (
        <div className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 text-xs transition ${
          themeClass('bg-slate-955/40 border-slate-850 hover:border-slate-800 text-slate-300', 'bg-slate-50/80 border-slate-250/60 hover:border-slate-300 text-slate-700')
        }`}>
          <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterCardInstanceId}
            onChange={(e) => setFilterCardInstanceId(e.target.value)}
            className="w-full bg-transparent outline-none border-none cursor-pointer font-semibold text-xs focus:ring-0"
          >
            <option value="all">All Cards</option>
            {ownedCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.customName}
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
    </div>
  );
}
