import React, { useState } from 'react';
import { Plus, Sparkles, CreditCard, Trash2, Check } from 'lucide-react';
import { WalletCreditCard } from './WalletCreditCard';
import { CardDetailDrawer } from './CardDetailDrawer';
import { CARDS_DB, AWARD_TEMPLATES } from '../data/cards.db';
import type { LoyaltyAward, CardTemplate } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import { getCardPotentialValue } from '../utils/valuationUtils';

interface WalletLibraryTabProps {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  getCardRecoupedValue: (id: string) => number;
  handleAddCard: (templateId: string) => void;
  handleAddCustomCard: (card: any) => void;
  renameCard: (instanceId: string, name: string) => void;
  setCardOpenDate: (instanceId: string, dateStr: string) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  updateCardMultipliers: (instanceId: string, multipliers: any) => void;
  toggleSignupBonus: (instanceId: string) => void;
  updateSignupBonusValue: (instanceId: string, value: number) => void;
  setAddOfferInstanceId: (instanceId: string) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsCreateAwardModalOpen: (open: boolean) => void;
  setDeleteCardInstanceId: (instanceId: string | null) => void;
  setDeleteAwardId: (awardId: string | null) => void;
  themeClass: (dark: string, light: string) => string;
  theme: 'dark' | 'light';
  selectedTemplates: string[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<string[]>>;
}

export function WalletLibraryTab({
  ownedCards,
  loyaltyAwards,
  getCardRecoupedValue,
  handleAddCard,
  handleAddCustomCard,
  renameCard,
  setCardOpenDate,
  removeInstanceOffer,
  updateCardMultipliers,
  toggleSignupBonus,
  updateSignupBonusValue,
  setAddOfferInstanceId,
  setIsCreateModalOpen,
  setIsCreateAwardModalOpen,
  setDeleteCardInstanceId,
  setDeleteAwardId,
  themeClass,
  theme,
  selectedTemplates,
  setSelectedTemplates
}: WalletLibraryTabProps) {
  const [deckSubTab, setDeckSubTab] = useState<'cards' | 'awards'>(() => {
    return (localStorage.getItem('cc-tracker-deck-sub-tab') as any) || 'cards';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [templateFeeFilter, setTemplateFeeFilter] = useState<'all' | 'free' | 'mid' | 'premium'>('all');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [activeTemplateDetail, setActiveTemplateDetail] = useState<CardTemplate | null>(null);

  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter standard card templates inside database for Search Library
  const filteredTemplates = CARDS_DB.filter((card) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !card.name.toLowerCase().includes(query) &&
        !card.bank.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (templateFeeFilter === 'free') return card.annualFee === 0;
    if (templateFeeFilter === 'mid') return card.annualFee > 0 && card.annualFee < 250;
    if (templateFeeFilter === 'premium') return card.annualFee >= 250;
    return true;
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplates((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Double-Deck Segmented Switcher (0% Visual Bloat!) */}
      <div className="flex justify-center mb-2 animate-fade-in">
        <div className={`flex gap-0.5 p-0.5 rounded-xl border w-full max-w-[280px] ${
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
                : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-505 hover:text-slate-800')
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
                : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-505 hover:text-slate-800')
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Awards ({loyaltyAwards.length})</span>
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
                My Wallet ({ownedCards.length} active cards)
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
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
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
              <div className="grid sm:grid-cols-2 gap-4">
                {ownedCards
                  .filter((instance) => {
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      const template = CARDS_DB.find((t) => t.id === instance.templateId);
                      const cardLabel = instance.customName.toLowerCase();
                      const bank = (instance.bank || template?.bank || '').toLowerCase();
                      if (!cardLabel.includes(query) && !bank.includes(query)) return false;
                    }
                    return true;
                  })
                  .map((instance) => (
                    <WalletCreditCard
                      key={instance.id}
                      instance={instance}
                      editingInstanceId={editingInstanceId}
                      setEditingInstanceId={setEditingInstanceId}
                      isCardExpanded={!!expandedCardIds[instance.id]}
                      toggleCardExpanded={toggleCardExpanded}
                      getCardRecoupedValue={getCardRecoupedValue}
                      handleAddCard={handleAddCard}
                      handleAddCustomCard={handleAddCustomCard}
                      handleRemoveCard={setDeleteCardInstanceId}
                      renameCard={renameCard}
                      setCardOpenDate={setCardOpenDate}
                      removeInstanceOffer={removeInstanceOffer}
                      updateCardMultipliers={updateCardMultipliers}
                      toggleSignupBonus={toggleSignupBonus}
                      updateSignupBonusValue={updateSignupBonusValue}
                      setAddOfferInstanceId={setAddOfferInstanceId}
                      themeClass={themeClass}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* 2. CARD TEMPLATE SELECTION LIBRARY */}
          <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
            themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                  🗂️ Templates Library
                </h3>
                <p className={`text-[9.5px] mt-0.5 font-medium ${themeClass('text-slate-450', 'text-slate-500')}`}>
                  Click templates to select and batch-add multiple cards to your Wallet in one go.
                </p>
              </div>

            {/* Standard Segmented Fee Filters */}
              <div className="flex gap-0.5 p-0.5 rounded-xl border border-slate-250 dark:border-slate-800/40 bg-slate-100 dark:bg-slate-955 select-none">
                {(['all', 'free', 'mid', 'premium'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTemplateFeeFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                      templateFeeFilter === filter
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow'
                        : themeClass('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-850')
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'free' ? '$0 Fee' : filter === 'mid' ? 'Mid Fee' : 'Premium'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-8 mt-6">
              {(['Amex', 'Chase', 'Citi', 'Other'] as const).map((bankName) => {
                const bankCards = filteredTemplates.filter((c) => {
                  if (bankName === 'Other') {
                    return c.bank !== 'Amex' && c.bank !== 'Chase' && c.bank !== 'Citi';
                  }
                  return c.bank === bankName;
                });
                if (bankCards.length === 0) return null;

                return (
                  <div key={bankName} className="space-y-3.5">
                    <div className={`flex items-center gap-2 border-b pb-2 ${themeClass('border-slate-900', 'border-slate-200')}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        bankName === 'Amex' ? 'bg-amber-500 shadow shadow-amber-500/20' :
                        bankName === 'Chase' ? 'bg-blue-500 shadow shadow-blue-500/20' :
                        bankName === 'Citi' ? 'bg-rose-500 shadow shadow-rose-500/20' : 'bg-purple-500 shadow shadow-purple-500/20'
                      }`} />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${themeClass('text-slate-300', 'text-slate-900')}`}>
                        {bankName === 'Other' ? 'Other Banks' : bankName === 'Citi' ? 'Citibank' : bankName === 'Amex' ? 'American Express' : bankName} Card Templates
                      </span>
                      <span className="text-[10px] text-slate-600 font-semibold ml-auto">
                        {bankCards.length} templates
                      </span>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      {bankCards.map((card) => {
                        const isSelected = selectedTemplates.includes(card.id);
                        return (
                          <div
                            key={card.id}
                            onClick={() => setActiveTemplateDetail(card)}
                            className={`p-4 rounded-xl border flex flex-col justify-between transition cursor-pointer hover:scale-[1.01] duration-200 relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] ${
                              isSelected
                                ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-500/5'
                                : themeClass('bg-slate-900/50 border-slate-850 hover:border-slate-800', 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm')
                            }`}
                          >
                            <div className="flex gap-3.5 items-start flex-grow pb-2 min-w-0">
                              {/* Mini CSS Metallic Vector Credit Card Preview */}
                              <div className={`w-16 h-10 rounded-md bg-gradient-to-r ${card.color} shrink-0 relative shadow-md border border-white/10 overflow-hidden`}>
                                {/* Chip */}
                                <div className="w-2.5 h-2 bg-amber-400/30 border border-amber-400/20 rounded-sm absolute top-1.5 left-1.5" />
                                {/* Generic Logo Watermark */}
                                <div className="absolute bottom-1 right-1.5 text-[4px] font-black uppercase tracking-widest text-white/20 font-sans">
                                  {card.bank}
                                </div>
                              </div>

                              <div className="min-w-0 flex-grow">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className={`text-[8px] font-bold px-1 rounded uppercase border ${
                                    themeClass('bg-slate-955 text-slate-400 border-slate-850', 'bg-white text-slate-505 border-slate-200')
                                  }`}>
                                    {card.bank}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                                    card.annualFee > 0
                                      ? themeClass('bg-slate-955 text-amber-400 border-slate-850/80', 'bg-slate-100 text-purple-600 border-slate-200')
                                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                                  }`}>
                                    {card.annualFee > 0 ? `Fee: $${card.annualFee}` : 'No Fee'}
                                  </span>
                                </div>
                                <h4 className={`text-sm font-extrabold mt-1.5 ${themeClass('text-white', 'text-slate-900')}`}>{card.name}</h4>
                                <p className={`text-[11px] mt-1.5 leading-relaxed font-medium ${themeClass('text-slate-405', 'text-slate-555')}`}>
                                  Contains <span className="font-bold text-purple-500 dark:text-amber-400">{card.benefits.length}</span> built-in perks <br />
                                  (Potential value: <span className={`font-bold ${themeClass('text-white', 'text-slate-955')}`}>${getCardPotentialValue(card.benefits)}/yr</span>)
                                </p>
                                <span className="text-[9px] text-purple-500 dark:text-purple-455 font-bold mt-2.5 block animate-pulse">
                                  🔍 Click card to view details
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent trigger details drawer
                                handleSelectTemplate(card.id);
                              }}
                              className={`w-full mt-4 flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.97] border cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-transparent shadow-md shadow-purple-600/20'
                                  : themeClass('bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700', 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm')
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  Select Template
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {deckSubTab === 'awards' && (
        <div className="space-y-6 animate-fade-in">
          {/* Standalone Loyalty Vouchers Box */}
          <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
            themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-2 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                <Sparkles className="w-4 h-4 text-purple-500 animate-spin-slow" />
                My Loyalty Awards & Vouchers ({loyaltyAwards.length} active)
              </h3>
              <button
                onClick={() => setIsCreateAwardModalOpen(true)}
                className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Register Standalone Award
              </button>
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
              <div className="grid sm:grid-cols-2 gap-4">
                {loyaltyAwards.map((award) => {
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

                  return (
                    <div
                      key={award.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition duration-200 ${
                        isCompleted
                          ? themeClass('bg-slate-955/40 border-slate-900 opacity-50', 'bg-slate-100 border-slate-200/70 opacity-60')
                          : themeClass('bg-slate-900/40 border-slate-850 hover:border-slate-700', 'bg-white border-slate-200 hover:border-slate-300 shadow-md text-slate-100')
                      }`}
                    >
                      <div className="pb-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            themeClass('bg-slate-950 text-slate-400 border border-slate-850', 'bg-slate-100 text-slate-555 border-slate-200')
                          }`}>
                            {info.brand}
                          </span>
                          <button
                            onClick={() => setDeleteAwardId(award.id)}
                            className="text-red-400 hover:text-red-350 p-1 rounded hover:bg-red-550/10 transition cursor-pointer active:scale-90"
                            title="Delete standalone award"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className={`text-sm font-extrabold mt-1.5 ${themeClass('text-white', 'text-slate-900')}`}>{info.name}</h4>
                        <p className={`text-[10px] mt-0.5 font-semibold ${themeClass('text-slate-450', 'text-slate-500')}`}>
                          Quantity: {award.quantity} • Value: ${info.value} each
                        </p>
                        <p className={`text-[11px] mt-2 ${themeClass('text-slate-300', 'text-slate-700')}`}>{award.notes || 'No extra notes.'}</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/10 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold ${themeClass('text-slate-300', 'text-slate-705')}`}>Used:</span>
                          <span className={`text-[11px] font-black ${themeClass('text-white', 'text-slate-900')}`}>
                            {usedQty} / {award.quantity}
                          </span>
                        </div>
                        <span className={`text-[10.5px] font-black uppercase tracking-wider ${
                          isCompleted ? 'text-emerald-400' : 'text-purple-400'
                        }`}>
                          {isCompleted ? '✓ Fully Claimed' : `Remaining: $${info.value * (award.quantity - usedQty)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}



      {/* Card Detail popover Sheet Drawer */}
      <CardDetailDrawer 
        isOpen={!!activeTemplateDetail}
        card={activeTemplateDetail}
        onClose={() => setActiveTemplateDetail(null)}
        onAdd={() => handleAddCard(activeTemplateDetail ? activeTemplateDetail.id : '')}
        theme={theme}
      />
    </div>
  );
}
