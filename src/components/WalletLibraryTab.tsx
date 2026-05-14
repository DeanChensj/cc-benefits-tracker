import React from 'react';
import { Sparkles, CreditCard, Compass } from 'lucide-react';
import { WalletCardsTab } from './WalletCardsTab';
import { WalletAwardsTab } from './WalletAwardsTab';
import { WalletTemplatesTab } from './WalletTemplatesTab';
import type { LoyaltyAward, CardTemplate } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface WalletLibraryTabProps {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  getCardRecoupedValue: (id: string) => number;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  setAddOfferInstanceId: (instanceId: string | null) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsCreateAwardModalOpen: (open: boolean) => void;
  setIsChurningDrawerOpen: (open: boolean) => void;
  setDeleteCardInstanceId: (instanceId: string | null) => void;
  setDeleteAwardId: (awardId: string | null) => void;

  themeClass: (dark: string, light: string) => string;
  selectedTemplates: string[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  onEditCard: (instance: OwnedCardInstance) => void;
  onEditAward: (award: LoyaltyAward) => void;
  deckSubTab: 'cards' | 'awards' | 'templates';
  setDeckSubTab: (tab: 'cards' | 'awards' | 'templates') => void;
  updateAwardUsedQuantity: (awardId: string, qty: number) => void;
  onViewTemplateDetail: (card: CardTemplate) => void;
  checkoutWinners: Record<string, { cardName: string; multiplier: number; ros: number; currency: string; bank: string } | null> | null;
}




export function WalletLibraryTab({
  ownedCards,
  loyaltyAwards,
  getCardRecoupedValue,
  removeInstanceOffer,
  setAddOfferInstanceId,
  setIsCreateModalOpen,
  setIsCreateAwardModalOpen,
  setIsChurningDrawerOpen,
  setDeleteCardInstanceId,
  setDeleteAwardId,

  themeClass,
  selectedTemplates,
  setSelectedTemplates,
  onEditCard,
  onEditAward,
  deckSubTab,
  setDeckSubTab,
  updateAwardUsedQuantity,
  onViewTemplateDetail,
  checkoutWinners
}: WalletLibraryTabProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  

  // Calculate Chase 5/24 status dynamically
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const chase524Count = ownedCards.filter((card) => {
    if (!card.cardOpenDate) return false;
    const openDate = new Date(card.cardOpenDate);
    return openDate >= twoYearsAgo;
  }).length;





  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tri-Deck Segmented Switcher (0% Visual Bloat!) */}
      <div className="flex justify-center animate-fade-in">
        <div className={`flex gap-0.5 p-0.5 rounded-xl border w-full max-w-[360px] transition-colors duration-300 ${
          themeClass('bg-zen-dark-card border-slate-850', 'bg-slate-200/50 border-slate-300/60 shadow-inner')
        }`}>
          <button
            onClick={() => {
              setDeckSubTab('cards');
              localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-250 flex items-center justify-center gap-1.5 cursor-pointer ${
              deckSubTab === 'cards'
                ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm')
                : themeClass('text-slate-300 hover:text-slate-50 hover:bg-slate-800/40', 'text-slate-555 hover:text-slate-855')
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>{t('tabCards')} ({ownedCards.length})</span>
          </button>
          <button
            onClick={() => {
              setDeckSubTab('awards');
              localStorage.setItem('cc-tracker-deck-sub-tab', 'awards');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-250 flex items-center justify-center gap-1.5 cursor-pointer ${
              deckSubTab === 'awards'
                ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm')
                : themeClass('text-slate-300 hover:text-slate-50 hover:bg-slate-800/40', 'text-slate-555 hover:text-slate-855')
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{t('tabAwards')} ({loyaltyAwards.length})</span>
          </button>
          <button
            onClick={() => {
              setDeckSubTab('templates');
              localStorage.setItem('cc-tracker-deck-sub-tab', 'templates');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-250 flex items-center justify-center gap-1.5 cursor-pointer ${
              deckSubTab === 'templates'
                ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm')
                : themeClass('text-slate-300 hover:text-slate-50 hover:bg-slate-800/40', 'text-slate-555 hover:text-slate-855')
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>{t('tabLibrary')}</span>
          </button>
        </div>
      </div>

      {deckSubTab === 'cards' && (
        <WalletCardsTab
          ownedCards={ownedCards}
          getCardRecoupedValue={getCardRecoupedValue}
          removeInstanceOffer={removeInstanceOffer}
          setAddOfferInstanceId={setAddOfferInstanceId}
          setDeleteCardInstanceId={setDeleteCardInstanceId}
          onEditCard={onEditCard}
          setIsChurningDrawerOpen={setIsChurningDrawerOpen}
          chase524Count={chase524Count}
          checkoutWinners={checkoutWinners}
          setIsCreateModalOpen={setIsCreateModalOpen}
          setDeckSubTab={setDeckSubTab}
        />
      )}

      {deckSubTab === 'templates' && (
        <WalletTemplatesTab
          ownedCards={ownedCards}
          selectedTemplates={selectedTemplates}
          setSelectedTemplates={setSelectedTemplates}
          onViewTemplateDetail={onViewTemplateDetail}
        />
      )}

      {deckSubTab === 'awards' && (
        <WalletAwardsTab
          loyaltyAwards={loyaltyAwards}
          setDeleteAwardId={setDeleteAwardId}
          updateAwardUsedQuantity={updateAwardUsedQuantity}
          onEditAward={onEditAward}
          setIsCreateAwardModalOpen={setIsCreateAwardModalOpen}
        />
      )}
    </div>
  );
}
