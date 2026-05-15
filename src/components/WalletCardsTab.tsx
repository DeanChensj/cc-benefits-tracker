import { useState, useMemo } from 'react';
import { CreditCard, LayoutGrid, List, Plus } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { CARDS_DB } from '../data/cards.db';

import type { OwnedCardInstance } from '../store/useCardStore';
import { CheckoutWinnersRow } from './CheckoutWinnersRow';
import { WalletCreditCard } from './WalletCreditCard';
import { EmptyWalletState } from './EmptyWalletState';

interface BankHeaderProps {
  bankName: string;
  count: number;
  suffix: string;
  themeClass: (dark: string, light: string) => string;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function BankHeader({ bankName, count, suffix, themeClass, collapsible, isCollapsed, onToggle }: BankHeaderProps) {
  const language = useTranslation().language;
  return (
    <div 
      className={`flex items-center justify-between mb-2 pb-1 border-b border-dashed ${themeClass('border-slate-800', 'border-slate-200')}`}
      onClick={collapsible ? onToggle : undefined}
      style={{ cursor: collapsible ? 'pointer' : 'default' }}
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-600')}`}>
          {bankName === 'Amex' ? 'American Express' :
           bankName === 'Chase' ? 'Chase Bank' :
           bankName === 'Citi' ? 'Citibank' :
           bankName === 'Other' ? (language === 'zh' ? '其他银行' : 'Other Banks') : bankName}
        </span>
        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
          themeClass('bg-slate-800 text-slate-400', 'bg-slate-100 text-slate-600')
        }`}>
          {count} {suffix}
        </span>
      </div>
      {collapsible && (
        <span className={`text-[9px] font-extrabold opacity-75 px-1.5 uppercase tracking-widest ${themeClass('text-slate-400', 'text-slate-500')}`}>
          {isCollapsed ? (language === 'zh' ? '展开' : 'EXPAND') : (language === 'zh' ? '折叠' : 'COLLAPSE')}
        </span>
      )}
    </div>
  );
}

interface WalletCardsTabProps {
  ownedCards: OwnedCardInstance[];
  getCardRecoupedValue: (id: string) => number;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  setAddOfferInstanceId: (id: string | null) => void;
  setDeleteCardInstanceId: (id: string | null) => void;
  onEditCard: (instance: OwnedCardInstance) => void;
  setIsChurningDrawerOpen: (open: boolean) => void;
  chase524Count: number;
  checkoutWinners: Record<string, { cardName: string; multiplier: number; ros: number; currency: string; bank: string } | null> | null;
  setIsCreateModalOpen: (open: boolean) => void;
  setDeckSubTab: (tab: 'cards' | 'awards' | 'templates') => void;
}

export function WalletCardsTab({
  ownedCards,
  getCardRecoupedValue,
  removeInstanceOffer,
  setAddOfferInstanceId,
  setDeleteCardInstanceId,
  onEditCard,
  setIsChurningDrawerOpen,
  chase524Count,
  checkoutWinners,
  setIsCreateModalOpen,
  setDeckSubTab
}: WalletCardsTabProps) {
  const { t, themeClass } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCompactView, setIsCompactView] = useState(() => {
    return localStorage.getItem('cc-tracker-compact-view') === 'true';
  });
  const [collapsedWalletBanks, setCollapsedWalletBanks] = useState<Record<string, boolean>>({});
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const searchedCards = useMemo(() => {
    return ownedCards.filter((instance) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const template = CARDS_DB.find((t) => t.id === instance.templateId);
        const name = template ? template.name.toLowerCase() : '';
        const customName = instance.customName ? instance.customName.toLowerCase() : '';
        const bank = (instance.bank || template?.bank || '').toLowerCase();
        
        if (!name.includes(query) && !customName.includes(query) && !bank.includes(query)) return false;
      }
      return true;
    });
  }, [ownedCards, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. MY WALLET (Active Cards) */}
      <div className={`border rounded-xl p-3 sm:p-6 transition duration-300 ${
        themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5 pb-1.5 border-b border-dashed border-slate-200/60 dark:border-slate-800/60 sm:mb-4 sm:pb-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-x-2 gap-y-1 flex-wrap md:flex-nowrap ${themeClass('text-slate-400', 'text-slate-555')}`}>
            <CreditCard className="w-4 h-4 text-purple-500" />
            <span className="whitespace-nowrap">{t('activeCardsTitle')} ({ownedCards.length} {ownedCards.length === 1 ? t('cardSuffix') : t('cardsSuffix')})</span>
            {ownedCards.length > 0 && (
              <>
                <span className="opacity-25 dark:opacity-40 text-slate-400 hidden md:inline">•</span>
                <button
                  type="button"
                  onClick={() => setIsChurningDrawerOpen(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold border transition active:scale-95 hover:scale-[1.02] cursor-pointer mt-0.5 md:mt-0 ${
                    chase524Count >= 5
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5'
                  }`}
                  title="Audit Churner Cooling application stats"
                >
                  <span>Chase:</span>
                  <span className="font-black">{chase524Count}/24</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                </button>
              </>
            )}
            {/* Compact View Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const newValue = !isCompactView;
                setIsCompactView(newValue);
                localStorage.setItem('cc-tracker-compact-view', String(newValue));
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all duration-250 cursor-pointer shrink-0 ml-1.5 ${
                isCompactView
                  ? themeClass('bg-slate-100 text-slate-955 shadow-md', 'bg-slate-900 text-white shadow-sm')
                  : themeClass('text-slate-300 hover:text-slate-50 hover:bg-slate-800/40', 'text-slate-500 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
              title={isCompactView ? "Switch to Grid View" : "Switch to Compact View"}
            >
              {isCompactView ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            </button>
          </h3>
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">

            <input
              type="text"
              placeholder={t('searchCardsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 w-full md:w-36 font-medium transition ${
                themeClass('bg-slate-955 border-slate-850 text-slate-200', 'bg-slate-55 border-slate-255 text-slate-800 shadow-inner')
              }`}
            />
            <button
              onClick={() => {
                setDeckSubTab('templates');
                localStorage.setItem('cc-tracker-deck-sub-tab', 'templates');
              }}
              className="flex items-center gap-1 bg-gradient-to-tr from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-white dark:from-slate-100 dark:to-slate-200 dark:hover:from-white dark:hover:to-slate-50 dark:text-slate-950 border border-slate-700/25 font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow shadow-black/5 cursor-pointer"
              title="Switch to template library catalog to add cards"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              {t('addTemplateBtn')}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1 bg-gradient-to-tr from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 text-white dark:from-slate-100 dark:to-slate-200 dark:hover:from-white dark:hover:to-slate-50 dark:text-slate-950 border border-slate-700/25 font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow shadow-black/5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              {t('createCustomBtn')}
            </button>
          </div>
        </div>

        {/* 0. Glanceable Point Multiplier Checkout Winners Row */}
        <CheckoutWinnersRow checkoutWinners={checkoutWinners} activeTab="cards" deckSubTab="cards" />

        {ownedCards.length === 0 ? (
          <EmptyWalletState
            themeClass={themeClass}
          />
        ) : (
          <div className={isCompactView ? "space-y-2" : "space-y-8"}>
            {
              // Group by Bank
              (['Amex', 'Chase', 'Citi', 'Other'] as const).map((bankName) => {
                const bankCards = searchedCards.filter((c) => {
                  const template = CARDS_DB.find((t) => t.id === c.templateId);
                  const b = c.bank || template?.bank || '';
                  if (bankName === 'Other') {
                    return b !== 'Amex' && b !== 'Chase' && b !== 'Citi';
                  }
                  return b === bankName;
                });

                if (bankCards.length === 0) return null;

                const isCollapsed = !!collapsedWalletBanks[bankName];

                return (
                  <div key={bankName} className="space-y-3.5 animate-fade-in">
                    <BankHeader
                      bankName={bankName}
                      count={bankCards.length}
                      suffix="Active Cards"
                      themeClass={themeClass}
                      collapsible={true}
                      isCollapsed={isCollapsed}
                      onToggle={() => setCollapsedWalletBanks((prev) => ({ ...prev, [bankName]: !prev[bankName] }))}
                    />
                    
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isCollapsed 
                        ? 'max-h-0 opacity-0 pointer-events-none' 
                        : 'max-h-[4000px] opacity-100 mt-3.5'
                    }`}>
                      <div className={isCompactView ? "space-y-2 mt-3.5" : "grid sm:grid-cols-2 gap-2.5 sm:gap-4"}>
                        {bankCards.map((instance) => (
                          <WalletCreditCard
                            key={instance.id}
                            instance={instance}
                            isCompactView={isCompactView}
                            isCardExpanded={!!expandedCardIds[instance.id]}
                            toggleCardExpanded={toggleCardExpanded}
                            getCardRecoupedValue={getCardRecoupedValue}
                            handleRemoveCard={setDeleteCardInstanceId}
                            removeInstanceOffer={removeInstanceOffer}
                            setAddOfferInstanceId={setAddOfferInstanceId}
                            onEditCard={onEditCard}
                            themeClass={themeClass}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}
      </div>
    </div>
  );
}
