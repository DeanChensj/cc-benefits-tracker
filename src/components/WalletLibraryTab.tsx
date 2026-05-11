import React, { useState } from 'react';
import { Plus, Sparkles, CreditCard, Trash2, Compass } from 'lucide-react';
import { WalletCreditCard } from './WalletCreditCard';
import { CardTemplatesCatalog } from './CardTemplatesCatalog';
import { CheckoutWinnersRow } from './CheckoutWinnersRow';
import { ChurningStatsDrawer } from './ChurningStatsDrawer';
import { AdvancedSettingsSection } from './AdvancedSettingsSection';
import { getAwardTheme } from '../utils/themeUtils';
import { CARDS_DB, AWARD_TEMPLATES } from '../data/cards.db';
import type { LoyaltyAward, CardTemplate } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import { useCardStore } from '../store/useCardStore';
import { translations } from '../utils/i18n';

interface WalletLibraryTabProps {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  getCardRecoupedValue: (id: string) => number;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  setAddOfferInstanceId: (instanceId: string) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsCreateAwardModalOpen: (open: boolean) => void;
  setDeleteCardInstanceId: (instanceId: string | null) => void;
  setDeleteAwardId: (awardId: string | null) => void;
  onWipe: () => void;
  themeClass: (dark: string, light: string) => string;
  selectedTemplates: string[];
  setSelectedTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  onEditCard: (instance: OwnedCardInstance) => void;
  deckSubTab: 'cards' | 'awards' | 'templates';
  setDeckSubTab: (tab: 'cards' | 'awards' | 'templates') => void;
  updateAwardUsedQuantity: (awardId: string, qty: number) => void;
  onViewTemplateDetail: (card: CardTemplate) => void;
  checkoutWinners: Record<string, { cardName: string; multiplier: number; ros: number; currency: string; bank: string } | null> | null;
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
  const language = useCardStore((state) => state.language);
  const dotColor = 
    bankName === 'Amex' ? 'bg-amber-500 shadow shadow-amber-500/20' :
    bankName === 'Chase' ? 'bg-blue-500 shadow shadow-blue-500/20' :
    bankName === 'Citi' ? 'bg-rose-500 shadow shadow-rose-500/20' : 'bg-purple-500 shadow shadow-purple-500/20';

  const title = 
    bankName === 'Other' ? (language === 'zh' ? '其他银行' : 'Other Banks') : 
    bankName === 'Citi' ? (language === 'zh' ? '花旗银行 (Citi)' : 'Citibank') : 
    bankName === 'Amex' ? (language === 'zh' ? '美国运通 (Amex)' : 'American Express') : bankName;

  const translatedSuffix = language === 'zh' 
    ? (suffix.includes('Templates') ? '推荐卡模板' : '卡片组合')
    : suffix;

  return (
    <div 
      onClick={collapsible ? onToggle : undefined}
      className={`flex items-center gap-2 border-b pb-2 select-none ${themeClass('border-slate-900', 'border-slate-200')} ${
        collapsible ? 'cursor-pointer hover:opacity-80 transition' : ''
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className={`text-[10px] font-black uppercase tracking-wider ${themeClass('text-slate-300', 'text-slate-900')}`}>
        {title} {translatedSuffix}
      </span>
      <span className="text-[10px] text-slate-650 dark:text-slate-550 font-semibold ml-auto">
        {count} {language === 'zh' ? '张卡片' : (count === 1 ? 'card' : 'cards')}
      </span>
      {collapsible && (
        <span className="text-[9px] font-black ml-1.5 text-slate-600 select-none">
          {isCollapsed 
            ? (language === 'zh' ? '▶ 展开' : '▶ Expand') 
            : (language === 'zh' ? '▼ 折叠' : '▼ Collapse')}
        </span>
      )}
    </div>
  );
}



export function WalletLibraryTab({
  ownedCards,
  loyaltyAwards,
  getCardRecoupedValue,
  removeInstanceOffer,
  setAddOfferInstanceId,
  setIsCreateModalOpen,
  setIsCreateAwardModalOpen,
  setDeleteCardInstanceId,
  setDeleteAwardId,
  onWipe,
  themeClass,
  selectedTemplates,
  setSelectedTemplates,
  onEditCard,
  deckSubTab,
  setDeckSubTab,
  updateAwardUsedQuantity,
  onViewTemplateDetail,
  checkoutWinners
}: WalletLibraryTabProps) {
  const language = useCardStore((state) => state.language);
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [collapsedWalletBanks, setCollapsedWalletBanks] = useState<Record<string, boolean>>({});
  const [isClaimedArchiveCollapsed, setIsClaimedArchiveCollapsed] = useState(true);
  const [awardSearchQuery, setAwardSearchQuery] = useState('');
  const [awardSortBy, setAwardSortBy] = useState<'expiry' | 'value-desc' | 'value-asc'>('expiry');
  const [isChurningDrawerOpen, setIsChurningDrawerOpen] = useState(false);

  // Calculate Chase 5/24 status dynamically
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const chase524Count = ownedCards.filter((card) => {
    if (!card.cardOpenDate) return false;
    const openDate = new Date(card.cardOpenDate);
    return openDate >= twoYearsAgo;
  }).length;



  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
        <div className="space-y-6 animate-fade-in">
          {/* 1. MY WALLET (Active Cards) */}
          <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
            themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-2 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 flex-wrap ${themeClass('text-slate-400', 'text-slate-555')}`}>
                <CreditCard className="w-4 h-4 text-purple-500" />
                <span>{t('activeCardsTitle')} ({ownedCards.length} {ownedCards.length === 1 ? t('cardSuffix') : t('cardsSuffix')})</span>
                {ownedCards.length > 0 && (
                  <>
                    <span className="opacity-25 dark:opacity-40 text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => setIsChurningDrawerOpen(true)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold border transition active:scale-95 hover:scale-[1.02] cursor-pointer ${
                        chase524Count >= 5
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5'
                      }`}
                      title="Audit Churner Cooling application stats"
                    >
                      <span>Chase 5/24:</span>
                      <span className="font-black">{chase524Count}/24</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    </button>
                  </>
                )}
              </h3>
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
                <input
                  type="text"
                  placeholder={t('searchCardsPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-550/10 w-full md:w-36 font-medium transition ${
                    themeClass('bg-slate-950 border-slate-850 text-slate-200', 'bg-slate-55 border-slate-255 text-slate-800 shadow-inner')
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
                  className="flex items-center gap-1 border border-slate-500/20 hover:bg-slate-500/5 text-slate-500 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  {t('createCustomBtn')}
                </button>
              </div>
            </div>

            {/* 0. Glanceable Point Multiplier Checkout Winners Row */}
            <CheckoutWinnersRow checkoutWinners={checkoutWinners} activeTab="cards" deckSubTab="cards" />

            {ownedCards.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-2xl mb-2">💳</p>
                <p className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-800')}`}>{t('noCardsYet')}</p>
                <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-455', 'text-slate-500')}`}>
                  {t('noCardsDesc')}
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
                <AdvancedSettingsSection themeClass={themeClass} onWipe={onWipe} />
              </div>
            )}
        </div>
      </div>
    )}

      {deckSubTab === 'templates' && (
        <div className="space-y-3.5">
          {useCardStore.getState().ownedCards.length === 0 && (
            <div className={`p-4 rounded-2xl border text-left relative overflow-hidden shadow-lg ${
              themeClass(
                'bg-gradient-to-br from-purple-950/30 via-indigo-950/15 to-slate-950/40 border-purple-500/15 text-slate-300',
                'bg-gradient-to-br from-purple-50/40 via-indigo-50/25 to-slate-100/40 border-purple-500/20 text-slate-750 shadow-sm'
              )
            }`}>
              {/* Microlight reflection sweep animation background */}
              <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full animate-[shimmer_3s_infinite]" />
              
              <h4 className={`text-xs font-black flex items-center gap-1.5 uppercase tracking-wider ${themeClass('text-purple-350', 'text-purple-700')}`}>
                {t('onboardBannerTitle')}
              </h4>
              <p className="text-[10.5px] leading-relaxed font-semibold mt-1.5 opacity-85">
                {t('onboardBannerDesc')}
              </p>
            </div>
          )}
          <CardTemplatesCatalog
            themeClass={themeClass}
            selectedTemplates={selectedTemplates}
            setSelectedTemplates={setSelectedTemplates}
            onViewTemplateDetail={onViewTemplateDetail}
          />
        </div>
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
              return infoB.value - infoA.value;
            case 'value-asc':
              return infoA.value - infoB.value;
            case 'expiry':
            default: {
              const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
              const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
              return dateA - dateB;
            }
          }
        });

        const activeAwards = sortedAwards.filter((a) => (a.usedQuantity || 0) < 1);
        const inactiveAwards = sortedAwards.filter((a) => (a.usedQuantity || 0) >= 1);

        const renderAwardCard = (award: typeof loyaltyAwards[0]) => {
          const getTranslatedProgramType = (p: string) => {
            if (language !== 'zh') return p;
            if (p.toLowerCase() === 'hotel') return '酒店常客 🏨';
            if (p.toLowerCase() === 'airline') return '航空里程 ✈️';
            if (p.toLowerCase() === 'bank') return '银行积分 🏦';
            return '其他类别 📦';
          };

          const isCustom = award.templateId === 'custom';
          const info = isCustom ? {
            name: award.customName || 'Custom Voucher',
            brand: award.customBrand || 'Other',
            programType: award.customProgramType || 'other',
            awardType: award.customAwardType || 'other',
            value: award.customValue || 0
          } : AWARD_TEMPLATES[award.templateId];

          const usedQty = award.usedQuantity || 0;
          const isCompleted = usedQty >= 1;
          const theme = getAwardTheme(info.brand, info.awardType || '', themeClass);

          return (
            <div
              key={award.id}
              className={`rounded-2xl border flex justify-between transition duration-200 relative overflow-hidden select-none min-h-[150px] bg-gradient-to-tr ${
                isCompleted ? 'opacity-50 grayscale-[30%]' : ''
              } ${theme.bgClass} ${themeClass('border-white/10 text-white', 'border-slate-250/80 text-slate-900 shadow-sm')}`}
            >
              {/* Background Angled Watermark */}
              <div className="absolute right-[32%] bottom-[-10px] select-none pointer-events-none opacity-[0.03] text-[50px] font-black tracking-widest uppercase font-sans -rotate-12 leading-none z-0">
                {theme.watermark}
              </div>

              {/* 1. Left Column: Main Ticket Body (70%) */}
              <div className="flex-grow p-4 relative text-left min-w-0 flex flex-col justify-between z-10 pr-2">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap w-full select-none">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0 ${theme.brandTagClass}`}>
                        {info.brand}
                      </span>
                      {info.programType && (
                        <span className={`text-[7.5px] font-bold uppercase tracking-wide truncate ${themeClass('text-white/75', 'text-slate-500')}`}>
                          • {getTranslatedProgramType(info.programType)}
                        </span>
                      )}
                    </div>
                    {award.expirationDate && (
                      <span className={`text-[8px] font-black tracking-widest uppercase shrink-0 ${
                        isCompleted 
                          ? 'line-through text-white/30 dark:text-white/20' 
                          : themeClass('text-white/90', 'text-slate-500')
                      }`}>
                        {t('expiresLabel')}: {award.expirationDate}
                      </span>
                    )}
                  </div>
                  
                  <h4 className={`text-xs font-black mt-2.5 break-words line-clamp-2 leading-snug ${themeClass('text-white', 'text-slate-900')}`}>
                    {info.name}
                  </h4>
                  
                  {award.notes && (
                    <p className={`text-[10px] mt-1.5 leading-relaxed font-semibold truncate ${themeClass('text-white/85', 'text-slate-600')}`}>
                      {award.notes}
                    </p>
                  )}
                </div>

                <div className={`mt-3 text-[8.5px] font-bold flex items-baseline gap-1 select-none ${themeClass('text-white/80', 'text-slate-500')}`}>
                  <span>{t('voucherValue')}</span>
                  <span className={`font-black text-base leading-none ${
                    isCompleted 
                      ? 'text-slate-400/60 line-through' 
                      : themeClass('text-teal-400', 'text-teal-600 font-black')
                  }`}>${info.value}</span>
                  <span className="opacity-50">{t('each')}</span>
                </div>
              </div>

              {/* 2. Right Column: Ticket Stub Receipt (30%) */}
              <div className="w-24 shrink-0 p-3.5 pt-6 flex flex-col justify-between items-center border-l-2 border-dashed border-white/10 dark:border-black/25 relative text-center z-10">
                {/* Circular Punch Tear Notches */}
                <div className={`absolute -top-2 -left-[9px] w-4.5 h-4.5 rounded-full z-20 ${themeClass('bg-slate-955', 'bg-slate-55')}`} />
                <div className={`absolute -bottom-2 -left-[9px] w-4.5 h-4.5 rounded-full z-20 ${themeClass('bg-slate-955', 'bg-slate-55')}`} />

                <button
                  onClick={() => setDeleteAwardId(award.id)}
                  className={`absolute top-2 right-2 p-1 rounded transition cursor-pointer active:scale-90 z-30 ${
                    themeClass('text-red-400 hover:text-red-300 hover:bg-red-500/10', 'text-red-600 hover:text-red-700 hover:bg-red-500/5')
                  }`}
                  title="Delete standalone award"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Interactive Use Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateAwardUsedQuantity(award.id, isCompleted ? 0 : 1);
                  }}
                  className={`w-full py-1.5 rounded-lg text-[8.5px] font-extrabold uppercase tracking-widest transition z-30 cursor-pointer active:scale-95 mt-3.5 ${
                    isCompleted
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : themeClass(
                          'bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-black/10 backdrop-blur-sm',
                          'bg-teal-600 hover:bg-teal-750 border border-teal-750 text-white shadow-sm shadow-teal-600/10'
                        )
                  }`}
                >
                  {isCompleted ? t('usedStatus') : t('claimBtn')}
                </button>

                <div className="w-full mt-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider block ${
                    isCompleted ? 'text-emerald-400/60 line-through' : themeClass(theme.glowColor, 'text-slate-600 font-extrabold')
                  }`}>
                    {isCompleted ? `${t('balancePrefix')}0` : `${t('balancePrefix')}${info.value}`}
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
                  {t('vouchersTitle')} ({activeAwards.length} {t('vouchersActive')})
                </h3>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    placeholder={t('searchVouchers')}
                    value={awardSearchQuery}
                    onChange={(e) => setAwardSearchQuery(e.target.value)}
                    className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-full sm:w-36 font-medium ${
                      themeClass('bg-slate-955 border-slate-850 focus:border-purple-500 text-slate-200', 'bg-slate-55 border-slate-255 focus:border-purple-500 text-slate-800 shadow-inner')
                    }`}
                  />
                  <select
                    value={awardSortBy}
                    onChange={(e) => setAwardSortBy(e.target.value as 'expiry' | 'value-desc' | 'value-asc')}
                    className={`border text-[10px] font-bold rounded-xl px-2 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer ${
                      themeClass('bg-slate-955 border-slate-850 text-slate-300', 'bg-slate-50 border-slate-255 text-slate-700 shadow-sm')
                    }`}
                  >
                    <option value="expiry">{t('sortExpiry')}</option>
                    <option value="value-desc">{t('sortValueDesc')}</option>
                    <option value="value-asc">{t('sortValueAsc')}</option>
                  </select>
                  <button
                    onClick={() => setIsCreateAwardModalOpen(true)}
                    className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    {t('addVoucherBtn')}
                  </button>
                </div>
              </div>

              {loyaltyAwards.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-2xl mb-2">🎁</p>
                  <p className={`text-xs font-bold ${themeClass('text-slate-300', 'text-slate-800')}`}>{t('noVouchers')}</p>
                  <p className={`text-[10px] mt-1 leading-normal ${themeClass('text-slate-455', 'text-slate-500')}`}>
                    {t('vouchersDesc')}
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
                          {t('claimedArchive')} ({inactiveAwards.length} {t('vouchersUsed')})
                        </span>
                        <span className={`text-[9px] font-black select-none transition duration-200 ${themeClass('text-slate-455 hover:text-slate-300', 'text-slate-500 hover:text-slate-700')}`}>
                          {isClaimedArchiveCollapsed ? t('expand') : t('collapse')}
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
      <ChurningStatsDrawer
        isOpen={isChurningDrawerOpen}
        onClose={() => setIsChurningDrawerOpen(false)}
        ownedCards={ownedCards}
        theme={themeClass('dark', 'light') as 'dark' | 'light'}
      />
    </div>
  );
}
