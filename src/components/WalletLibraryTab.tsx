import React, { useState } from 'react';
import { Plus, Sparkles, CreditCard, Trash2, Compass } from 'lucide-react';
import { WalletCreditCard } from './WalletCreditCard';
import { CardTemplatesCatalog } from './CardTemplatesCatalog';
import { CARDS_DB, AWARD_TEMPLATES } from '../data/cards.db';
import type { LoyaltyAward } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';

interface WalletLibraryTabProps {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  getCardRecoupedValue: (id: string) => number;
  handleAddCard: (templateId: string) => void;
  handleAddCustomCard: (card: any) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  setAddOfferInstanceId: (instanceId: string) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsCreateAwardModalOpen: (open: boolean) => void;
  setDeleteCardInstanceId: (instanceId: string | null) => void;
  setDeleteAwardId: (awardId: string | null) => void;
  themeClass: (dark: string, light: string) => string;
  theme: 'dark' | 'light';
  selectedTemplates: string[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  onEditCard: (instance: OwnedCardInstance) => void;
  deckSubTab: 'cards' | 'awards' | 'templates';
  setDeckSubTab: (tab: 'cards' | 'awards' | 'templates') => void;
  updateAwardUsedQuantity: (awardId: string, qty: number) => void;
}
interface BankHeaderProps {
  bankName: 'Amex' | 'Chase' | 'Citi' | 'Other';
  count: number;
  suffix: string;
  themeClass: (dark: string, light: string) => string;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function BankHeader({ bankName, count, suffix, themeClass, collapsible, isCollapsed, onToggle }: BankHeaderProps) {
  const dotColor = 
    bankName === 'Amex' ? 'bg-amber-500 shadow shadow-amber-500/20' :
    bankName === 'Chase' ? 'bg-blue-500 shadow shadow-blue-500/20' :
    bankName === 'Citi' ? 'bg-rose-500 shadow shadow-rose-500/20' : 'bg-purple-500 shadow shadow-purple-500/20';

  const title = 
    bankName === 'Other' ? 'Other Banks' : 
    bankName === 'Citi' ? 'Citibank' : 
    bankName === 'Amex' ? 'American Express' : bankName;

  return (
    <div 
      onClick={collapsible ? onToggle : undefined}
      className={`flex items-center gap-2 border-b pb-2 select-none ${themeClass('border-slate-900', 'border-slate-200')} ${
        collapsible ? 'cursor-pointer hover:opacity-80 transition' : ''
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className={`text-[10px] font-black uppercase tracking-wider ${themeClass('text-slate-300', 'text-slate-900')}`}>
        {title} {suffix}
      </span>
      <span className="text-[10px] text-slate-650 dark:text-slate-505 font-semibold ml-auto">
        {count} {count === 1 ? 'card' : 'cards'}
      </span>
      {collapsible && (
        <span className="text-[9px] font-black ml-1.5 text-slate-600 select-none">
          {isCollapsed ? '▶ Expand' : '▼ Collapse'}
        </span>
      )}
    </div>
  );
}

function getAwardTheme(brandName: string, awardType: string, themeClass: (dark: string, light: string) => string) {
  const brand = brandName.toLowerCase();
  const type = awardType.toLowerCase();

  if (brand.includes('marriott')) {
    return {
      bgClass: themeClass(
        'from-slate-900 via-slate-900/95 to-stone-950 border-amber-500/10 text-amber-400 shadow-[0_8px_25px_rgba(245,158,11,0.05)]', 
        'from-amber-50/30 via-amber-50/20 to-stone-100/40 border-amber-600/20 text-amber-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-amber-500/10 text-amber-400 border-amber-500/20', 'bg-amber-600/10 text-amber-800 border-amber-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: type.includes('sua') || type.includes('upgrade') ? 'UPGRADE' : 'FREE NIGHT',
      glowColor: themeClass('text-amber-400', 'text-amber-600')
    };
  }
  if (brand.includes('hyatt')) {
    return {
      bgClass: themeClass(
        'from-blue-950 via-blue-950/95 to-slate-955 border-blue-500/10 text-blue-400 shadow-[0_8px_25px_rgba(59,130,246,0.05)]', 
        'from-blue-50/30 via-blue-50/20 to-sky-100/40 border-blue-600/20 text-blue-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-blue-500/10 text-blue-400 border-blue-500/20', 'bg-blue-600/10 text-blue-800 border-blue-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: type.includes('sua') ? 'SUITE UPGRADE' : 'REWARD NIGHT',
      glowColor: themeClass('text-blue-400', 'text-blue-600')
    };
  }
  if (brand.includes('hilton')) {
    return {
      bgClass: themeClass(
        'from-indigo-950 via-indigo-950/95 to-slate-955 border-indigo-500/10 text-indigo-400 shadow-[0_8px_25px_rgba(99,102,241,0.05)]', 
        'from-indigo-50/30 via-indigo-50/20 to-violet-100/40 border-indigo-600/20 text-indigo-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 'bg-indigo-600/10 text-indigo-800 border-indigo-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: 'REWARD NIGHT',
      glowColor: themeClass('text-indigo-400', 'text-indigo-600')
    };
  }
  if (brand.includes('ihg')) {
    return {
      bgClass: themeClass(
        'from-emerald-950 via-emerald-950/95 to-slate-955 border-emerald-500/10 text-emerald-400 shadow-[0_8px_25px_rgba(16,185,129,0.05)]', 
        'from-emerald-50/30 via-emerald-50/20 to-teal-100/40 border-emerald-600/20 text-emerald-800 shadow-sm'
      ),
      brandTagClass: themeClass('bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 'bg-emerald-600/10 text-emerald-800 border-emerald-600/20'),
      subTextClass: themeClass('text-slate-400', 'text-slate-600'),
      watermark: 'FREE NIGHT',
      glowColor: themeClass('text-emerald-400', 'text-emerald-600')
    };
  }
  return {
    bgClass: themeClass(
      'from-purple-950 via-purple-955/95 to-slate-955 border-purple-500/10 text-purple-400 shadow-[0_8px_25px_rgba(168,85,247,0.05)]', 
      'from-purple-50/30 via-purple-50/20 to-fuchsia-100/40 border-purple-600/20 text-purple-800 shadow-sm'
    ),
    brandTagClass: themeClass('bg-purple-500/10 text-purple-400 border-purple-500/20', 'bg-purple-600/10 text-purple-800 border-purple-600/20'),
    subTextClass: themeClass('text-slate-400', 'text-slate-600'),
    watermark: 'VOUCHER',
    glowColor: themeClass('text-purple-400', 'text-purple-600')
  };
}

export function WalletLibraryTab({
  ownedCards,
  loyaltyAwards,
  getCardRecoupedValue,
  handleAddCard,
  handleAddCustomCard,
  removeInstanceOffer,
  setAddOfferInstanceId,
  setIsCreateModalOpen,
  setIsCreateAwardModalOpen,
  setDeleteCardInstanceId,
  setDeleteAwardId,
  themeClass,
  theme,
  selectedTemplates,
  setSelectedTemplates,
  onEditCard,
  deckSubTab,
  setDeckSubTab,
  updateAwardUsedQuantity
}: WalletLibraryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [collapsedWalletBanks, setCollapsedWalletBanks] = useState<Record<string, boolean>>({});
  const [isClaimedArchiveCollapsed, setIsClaimedArchiveCollapsed] = useState(true);
  const [awardSearchQuery, setAwardSearchQuery] = useState('');
  const [awardSortBy, setAwardSortBy] = useState<'expiry' | 'value-desc' | 'value-asc'>('expiry');



  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tri-Deck Segmented Switcher (0% Visual Bloat!) */}
      <div className="flex justify-center animate-fade-in">
        <div className={`flex gap-0.5 p-0.5 rounded-xl border w-full max-w-[360px] ${
          themeClass('bg-slate-955 border-slate-850/80', 'bg-slate-200/40 border-slate-300/60')
        }`}>
          <button
            onClick={() => {
              setDeckSubTab('cards');
              localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              deckSubTab === 'cards'
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/10'
                : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-555 hover:text-slate-850')
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Cards ({ownedCards.length})</span>
          </button>
          <button
            onClick={() => {
              setDeckSubTab('awards');
              localStorage.setItem('cc-tracker-deck-sub-tab', 'awards');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              deckSubTab === 'awards'
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/10'
                : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-555 hover:text-slate-850')
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Awards ({loyaltyAwards.length})</span>
          </button>
          <button
            onClick={() => {
              setDeckSubTab('templates');
              localStorage.setItem('cc-tracker-deck-sub-tab', 'templates');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              deckSubTab === 'templates'
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/10'
                : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-555 hover:text-slate-850')
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Library</span>
          </button>
        </div>
      </div>

      {deckSubTab === 'cards' && (
        <div className="space-y-6 animate-fade-in">
          {/* 1. MY WALLET (Active Cards) */}
          <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
            themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-2 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                <CreditCard className="w-4 h-4 text-purple-500" />
                My Wallet ({ownedCards.length} cards)
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="🔍 Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-44 font-medium ${
                    themeClass('bg-slate-955 border-slate-850 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-255 focus:border-purple-500 text-slate-800 shadow-inner')
                  }`}
                />
                <button
                  onClick={() => {
                    setDeckSubTab('templates');
                    localStorage.setItem('cc-tracker-deck-sub-tab', 'templates');
                  }}
                  className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
                  title="Switch to template library catalog to add cards"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Add Template Card
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1 border border-purple-500/20 hover:bg-purple-550/10 text-purple-400 font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Create Custom Card
                </button>
              </div>
            </div>

            {ownedCards.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-2xl mb-2">💳</p>
                <p className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-800')}`}>No cards added yet!</p>
                <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-450', 'text-slate-500')}`}>
                  Select card templates from the library below to populate your credit card wallet.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {(['Amex', 'Chase', 'Citi', 'Other'] as const).map((bankName) => {
                  const searchedCards = ownedCards.filter((instance) => {
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      const template = CARDS_DB.find((t) => t.id === instance.templateId);
                      const cardLabel = instance.customName.toLowerCase();
                      const bank = (instance.bank || template?.bank || '').toLowerCase();
                      if (!cardLabel.includes(query) && !bank.includes(query)) return false;
                    }
                    return true;
                  });

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
                        <div className="grid sm:grid-cols-2 gap-4">
                          {bankCards.map((instance) => (
                            <WalletCreditCard
                              key={instance.id}
                              instance={instance}
                              
                              isCardExpanded={!!expandedCardIds[instance.id]}
                              toggleCardExpanded={toggleCardExpanded}
                              getCardRecoupedValue={getCardRecoupedValue}
                              handleAddCard={handleAddCard}
                              handleAddCustomCard={handleAddCustomCard}
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
                })}
              </div>
            )}
        </div>
      </div>
    )}

      {deckSubTab === 'templates' && (
        <CardTemplatesCatalog
          themeClass={themeClass}
          theme={theme}
          selectedTemplates={selectedTemplates}
          setSelectedTemplates={setSelectedTemplates}
          handleAddCard={handleAddCard}
        />
      )}

      {deckSubTab === 'awards' && (() => {
        const filteredAwards = loyaltyAwards.filter((a) => {
          if (awardSearchQuery) {
            const query = awardSearchQuery.toLowerCase();
            const isCustom = a.templateId === 'custom';
            const info = isCustom ? {
              name: a.customName || 'Custom Voucher',
              brand: a.customBrand || 'Other',
            } : AWARD_TEMPLATES[a.templateId];
            const name = info.name.toLowerCase();
            const brand = info.brand.toLowerCase();
            const notes = (a.notes || '').toLowerCase();
            if (!name.includes(query) && !brand.includes(query) && !notes.includes(query)) return false;
          }
          return true;
        });

        const sortedAwards = [...filteredAwards].sort((a, b) => {
          const isCustomA = a.templateId === 'custom';
          const infoA = isCustomA ? { value: a.customValue || 0 } : AWARD_TEMPLATES[a.templateId];
          const isCustomB = b.templateId === 'custom';
          const infoB = isCustomB ? { value: b.customValue || 0 } : AWARD_TEMPLATES[b.templateId];

          switch (awardSortBy) {
            case 'value-desc':
              return (infoB.value * b.quantity) - (infoA.value * a.quantity);
            case 'value-asc':
              return (infoA.value * a.quantity) - (infoB.value * b.quantity);
            case 'expiry':
            default:
              const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
              const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
              return dateA - dateB;
          }
        });

        const activeAwards = sortedAwards.filter((a) => (a.usedQuantity || 0) < a.quantity);
        const inactiveAwards = sortedAwards.filter((a) => (a.usedQuantity || 0) >= a.quantity);

        const renderAwardCard = (award: typeof loyaltyAwards[0]) => {
          const isCustom = award.templateId === 'custom';
          const info = isCustom ? {
            name: award.customName || 'Custom Voucher',
            brand: award.customBrand || 'Other',
            programType: award.customProgramType || 'other',
            awardType: award.customAwardType || 'other',
            value: award.customValue || 0
          } : AWARD_TEMPLATES[award.templateId];

          const usedQty = award.usedQuantity || 0;
          const isCompleted = usedQty === award.quantity;
          const theme = getAwardTheme(info.brand, info.awardType || '', themeClass);

          return (
            <div
              key={award.id}
              className={`rounded-2xl border flex justify-between transition duration-200 relative overflow-hidden select-none min-h-[160px] bg-gradient-to-tr ${
                isCompleted ? 'opacity-50 grayscale-[30%]' : ''
              } ${theme.bgClass}`}
            >
              {/* Background Angled Watermark */}
              <div className="absolute right-[32%] bottom-[-10px] select-none pointer-events-none opacity-[0.03] text-[50px] font-black tracking-widest uppercase font-sans -rotate-12 leading-none z-0">
                {theme.watermark}
              </div>

              {/* 1. Left Column: Main Ticket Body (70%) */}
              <div className="flex-grow p-4 relative text-left min-w-0 flex flex-col justify-between z-10 pr-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${theme.brandTagClass}`}>
                      {info.brand}
                    </span>
                    {info.programType && (
                      <span className={`text-[7.5px] font-bold uppercase tracking-wide opacity-75`}>
                        • {info.programType}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black mt-2 truncate leading-tight">
                    {info.name}
                  </h4>
                  {award.notes && (
                    <p className="text-[11px] mt-2 leading-relaxed font-medium truncate opacity-90">
                      {award.notes}
                    </p>
                  )}
                </div>

                <div className="mt-3 text-[9px] font-bold opacity-80 flex items-center gap-1 flex-wrap">
                  <span>Value:</span>
                  <span className="font-black text-sm leading-none">${info.value}</span>
                  <span className="opacity-60">each</span>
                </div>
              </div>

              {/* 2. Right Column: Ticket Stub Receipt (30%) */}
              <div className="w-28 shrink-0 p-4 flex flex-col justify-between items-center border-l-2 border-dashed border-white/10 dark:border-black/25 relative text-center z-10">
                {/* Circular Punch Tear Notches */}
                <div className={`absolute -top-2 -left-[9px] w-4.5 h-4.5 rounded-full z-20 ${themeClass('bg-slate-955', 'bg-slate-55')}`} />
                <div className={`absolute -bottom-2 -left-[9px] w-4.5 h-4.5 rounded-full z-20 ${themeClass('bg-slate-955', 'bg-slate-55')}`} />

                <button
                  onClick={() => setDeleteAwardId(award.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition cursor-pointer active:scale-90 z-30"
                  title="Delete standalone award"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Interactive Use Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateAwardUsedQuantity(award.id, isCompleted ? 0 : award.quantity);
                  }}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition z-30 cursor-pointer active:scale-95 mt-4 ${
                    isCompleted
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : themeClass(
                          'bg-white/15 hover:bg-white/25 text-white border border-white/10',
                          'bg-purple-600 hover:bg-purple-700 text-white'
                        )
                  }`}
                >
                  {isCompleted ? '✓ Claimed' : 'Claim'}
                </button>

                <div className="w-full mt-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider block ${
                    isCompleted ? 'text-emerald-400/60 line-through' : theme.glowColor
                  }`}>
                    {isCompleted ? 'Bal: $0' : `Bal: $${info.value}`}
                  </span>
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Standalone Loyalty Vouchers Box */}
            <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
              themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-2 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                  <Sparkles className="w-4 h-4 text-purple-500 animate-spin-slow" />
                  My Vouchers ({activeAwards.length} active)
                </h3>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    placeholder="🔍 Search vouchers..."
                    value={awardSearchQuery}
                    onChange={(e) => setAwardSearchQuery(e.target.value)}
                    className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-full sm:w-36 font-medium ${
                      themeClass('bg-slate-955 border-slate-850 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-255 focus:border-purple-500 text-slate-800 shadow-inner')
                    }`}
                  />
                  <select
                    value={awardSortBy}
                    onChange={(e) => setAwardSortBy(e.target.value as any)}
                    className={`border text-[10px] font-bold rounded-xl px-2 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer ${
                      themeClass('bg-slate-955 border-slate-850 text-slate-300', 'bg-slate-50 border-slate-255 text-slate-700 shadow-sm')
                    }`}
                  >
                    <option value="expiry">📅 Expiry (Soonest)</option>
                    <option value="value-desc">💵 Value: High to Low</option>
                    <option value="value-asc">💵 Value: Low to High</option>
                  </select>
                  <button
                    onClick={() => setIsCreateAwardModalOpen(true)}
                    className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Register Standalone Award
                  </button>
                </div>
              </div>

              {loyaltyAwards.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-2xl mb-2">🎁</p>
                  <p className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-800')}`}>No standalone vouchers registered!</p>
                  <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-450', 'text-slate-500')}`}>
                    Track card-independent travel vouchers, hotel free night certificates, points bundles, or airline companion awards.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Section 1: Active Vouchers Grid */}
                  {activeAwards.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {activeAwards.map(renderAwardCard)}
                    </div>
                  )}

                  {/* Section 2: Inactive/Claimed Vouchers Archive */}
                  {inactiveAwards.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800/60 space-y-3.5">
                      <div 
                        onClick={() => setIsClaimedArchiveCollapsed(!isClaimedArchiveCollapsed)}
                        className="flex items-center justify-between cursor-pointer select-none group"
                      >
                        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${themeClass('text-slate-400', 'text-slate-500')} group-hover:opacity-80 transition`}>
                          📁 Claimed Vouchers Archive ({inactiveAwards.length} claimed)
                        </span>
                        <span className={`text-[9px] font-black select-none transition duration-200 ${themeClass('text-slate-450 hover:text-slate-300', 'text-slate-500 hover:text-slate-700')}`}>
                          {isClaimedArchiveCollapsed ? '▶ Expand' : '▼ Collapse'}
                        </span>
                      </div>
                      
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isClaimedArchiveCollapsed 
                          ? 'max-h-0 opacity-0 pointer-events-none' 
                          : 'max-h-[3000px] opacity-100 mt-3.5'
                      }`}>
                        <div className="grid sm:grid-cols-2 gap-4 opacity-60 grayscale-[30%] hover:opacity-85 hover:grayscale-[10%] transition duration-300">
                          {inactiveAwards.map(renderAwardCard)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
