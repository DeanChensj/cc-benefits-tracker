import { useState, useEffect, useMemo, useRef } from 'react';
// Meticulously audited and verified PWA release build with dynamic re-auth and contrast fixes
import { CARDS_DB, CARD_MULTIPLIERS, AWARD_TEMPLATES } from './data/cards.db';
import type { CardTemplate, Benefit, LoyaltyAward } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { WalletAiAssistant } from './components/WalletAiAssistant';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { CreateCardModal } from './components/CreateCardModal';
import { CreateAwardModal } from './components/CreateAwardModal';
import { AddOfferModal } from './components/AddOfferModal';
import { EditCardModal } from './components/EditCardModal';
import { CardDetailDrawer } from './components/CardDetailDrawer';
import { Toast } from './components/Toast';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { EmptyWalletState } from './components/EmptyWalletState';
import { CheckoutWinnersRow } from './components/CheckoutWinnersRow';
import { AnnualFeeWarningsWidget } from './components/AnnualFeeWarningsWidget';
import { SavingsWrappedModal } from './components/SavingsWrappedModal';
import { CloudSyncBanner } from './components/CloudSyncBanner';
import { ActiveChecklistTab } from './components/ActiveChecklistTab';
import { WalletLibraryTab } from './components/WalletLibraryTab';
import { getLocalDateString, getAnnualFeeWarningInfo } from './utils/dateUtils';
import { getResolvedValue, getCardRecoupedValue } from './utils/valuationUtils';
import { parseLogEntry } from './utils/logUtils';
import { obfuscateKey } from './utils/cryptoUtils';
import { loadGoogleGsiScript, requestGDriveToken, fetchUserEmail } from './utils/gdrive';
import { 
  CheckCircle2, 
  Sun,
  Moon,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';



function App() {
  const { 
    ownedCards, 
    loyaltyAwards,
    logs, 
    theme,
    toggleTheme,
    isGroupedView,
    setIsGroupedView,
    gdriveEmail,
    syncStatus,
    lastSyncedTime,
    setGDriveCredentials,
    setSyncStatus,
    customClientId,
    addCard, 
    addCardsBatch,
    addCustomCard,
    removeCard, 
    renameCard,
    setCardOpenDate, 
    toggleBenefit, 
    updateProgressLog,
    addInstanceOffer,
    removeInstanceOffer,
    updateCardMultipliers,
    toggleSignupBonus,
    updateSignupBonusValue,
    toggleLoyaltyAward,
    deleteLoyaltyAward,
    updateAwardUsedQuantity,
    pruneExpiredLogs,
    resetAll 
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  const lastSyncTimeRef = useRef<number>(0);

  // Date to evaluate states against (defaults to current system date)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'todo' | 'cards'>(() => (localStorage.getItem('cc-tracker-active-tab') as 'todo' | 'cards') || 'todo');
  const [deckSubTab, setDeckSubTab] = useState<'cards' | 'awards' | 'templates'>(() => {
    return (localStorage.getItem('cc-tracker-deck-sub-tab') as 'cards' | 'awards' | 'templates') || 'cards';
  });
  const [activeModal, setActiveModal] = useState<'sync' | 'create-card' | 'create-award' | 'wrapped' | 'disconnect-gdrive' | 'wipe' | null>(null);
  const [addOfferInstanceId, setAddOfferInstanceId] = useState<string | null>(null);
  const [deleteCardInstanceId, setDeleteCardInstanceId] = useState<string | null>(null);
  const [deleteAwardId, setDeleteAwardId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [activeTemplateDetail, setActiveTemplateDetail] = useState<CardTemplate | null>(null);
  const [activeEditInstanceId, setActiveEditInstanceId] = useState<string | null>(null);
  const activeEditInstance = ownedCards.find((c) => c.id === activeEditInstanceId) || null;

  const lastActionRef = useRef<{ logKey: string; prevResolved: boolean; prevSpentProgress?: number } | null>(null);

  const [dismissedWarningCardIds, setDismissedWarningCardIds] = useState<Record<string, boolean>>({});
  
  const dismissWarning = (cardId: string) => {
    setDismissedWarningCardIds((prev) => ({
      ...prev,
      [cardId]: true
    }));
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; onUndo?: () => void } | null>(null);

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'success',
    onUndo?: () => void
  ) => {
    setToast({ message, type, onUndo });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChecklistToggle = (key: string) => {
    const ab = activeBenefits.find((b) => b.logKey === key);
    if (!ab) return;

    if (ab.loyaltyAward) {
      const targetAward = loyaltyAwards.find((a) => a.id === ab.loyaltyAward?.id);
      if (!targetAward) return;

      lastActionRef.current = {
        logKey: targetAward.id,
        prevResolved: targetAward.usedQuantity >= targetAward.quantity,
        prevSpentProgress: targetAward.usedQuantity
      };

      toggleLoyaltyAward(targetAward.id);
    } else {
      const obfuscated = obfuscateKey(key);
      const entry = parseLogEntry(logs[obfuscated]);
      lastActionRef.current = {
        logKey: key,
        prevResolved: entry ? !!entry.resolved : false,
        prevSpentProgress: entry ? entry.spentProgress : 0
      };

      toggleBenefit(key);
    }

    showToast(ab.loyaltyAward ? 'Loyalty Voucher logged successfully' : 'Perk logged successfully', 'success', () => {
      if (lastActionRef.current) {
        const snap = lastActionRef.current;
        if (ab.loyaltyAward) {
          if (snap.prevSpentProgress !== undefined) {
            updateAwardUsedQuantity(snap.logKey, snap.prevSpentProgress);
          }
        } else {
          if (snap.prevSpentProgress !== undefined) {
            updateProgressLog(snap.logKey, snap.prevSpentProgress);
          }
          const currentObfuscated = obfuscateKey(snap.logKey);
          const currentEntry = parseLogEntry(useCardStore.getState().logs[currentObfuscated]);
          if (!currentEntry || (!!currentEntry.resolved !== snap.prevResolved)) {
            toggleBenefit(snap.logKey);
          }
        }
        lastActionRef.current = null;
        showToast('Action reverted', 'info');
      }
    });
  };

  const handleUpdateProgressLog = (logKey: string, spent: number) => {
    const obfuscated = obfuscateKey(logKey);
    const entry = parseLogEntry(logs[obfuscated]);
    lastActionRef.current = {
      logKey,
      prevResolved: entry ? !!entry.resolved : false,
      prevSpentProgress: entry ? entry.spentProgress : 0
    };

    updateProgressLog(logKey, spent);

    showToast(`Progress updated to $${spent}`, 'success', () => {
      if (lastActionRef.current) {
        const snap = lastActionRef.current;
        if (snap.prevSpentProgress !== undefined) {
          updateProgressLog(snap.logKey, snap.prevSpentProgress);
        }
        const currentObfuscated = obfuscateKey(snap.logKey);
        const currentEntry = parseLogEntry(useCardStore.getState().logs[currentObfuscated]);
        if (!currentEntry || (!!currentEntry.resolved !== snap.prevResolved)) {
          toggleBenefit(snap.logKey);
        }
        lastActionRef.current = null;
        showToast('Action reverted', 'info');
      }
    });
  };

  const handleAddCard = (templateId: string) => {
    const template = CARDS_DB.find((t) => t.id === templateId);
    const cardName = template ? template.name : 'Card';
    addCard(templateId);
    setDeckSubTab('cards');
    localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
    showToast(`🎉 Added ${cardName} to your Wallet!`);
  };


  const handleConfirmRemoveCard = () => {
    if (!deleteCardInstanceId) return;
    const instance = ownedCards.find((c) => c.id === deleteCardInstanceId);
    if (instance) {
      const template = CARDS_DB.find((t) => t.id === instance.templateId);
      const cardName = instance.templateId === 'custom' ? instance.customName : (template?.name || 'Card');
      removeCard(deleteCardInstanceId);
      showToast(`🗑️ Removed "${cardName}" from Wallet`, 'warning');
    }
    setDeleteCardInstanceId(null);
  };

  const handleAddCustomCard = (card: Omit<OwnedCardInstance, 'id'>) => {
    addCustomCard(card);
    showToast(`🎉 Created and added "${card.customName}" to your Wallet!`);
  };

  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Load Google Identity Services script dynamically on mount
  useEffect(() => {
    // Dynamically prune expired打卡 logs older than 2 years to maintain tiny capped DB footprint!
    pruneExpiredLogs(currentDate);

    loadGoogleGsiScript()
      .then(() => console.log('Google GIS client successfully pre-loaded.'))
      .catch((err) => console.error('Failed to load Google GIS Client library:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist navigation tab and main dashboard filter settings in localStorage for seamless reload experience
  useEffect(() => {
    localStorage.setItem('cc-tracker-active-tab', activeTab);
  }, [activeTab]);

  // Auto-Refocus Sync: Trigger background two-way sync merge when browser tab is focused
  useEffect(() => {
    const handleFocus = () => {
      const state = useCardStore.getState();
      if (state.gdriveToken && state.syncStatus === 'synced') {
        const now = Date.now();
        if (now - lastSyncTimeRef.current < 30000) return; // Throttle high-frequency requests
        lastSyncTimeRef.current = now;

        console.log('🔄 Auto-Refocus Sync: Tab focused. Triggering background sync merge.');
        state.syncWithGDrive().catch((err) => console.error('Auto-Refocus Sync failed:', err));
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [syncStatus]);

  // Connection & Sync Handlers
  const handleLinkGoogleDrive = async () => {
    setSyncStatus('syncing');
    try {
      const token = await requestGDriveToken(customClientId);
      const email = await fetchUserEmail(token);
      setGDriveCredentials(token, email);
      
      // Trigger first two-way sync
      await useCardStore.getState().syncWithGDrive();
      showToast('🎉 Connected and synchronized with Google Drive successfully!');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      showToast('❌ Failed to connect to Google Drive. Please try again.', 'error');
    }
  };

  const handleDisconnectGoogleDrive = () => {
    setActiveModal('disconnect-gdrive');
  };

  const handleConfirmDisconnectGoogleDrive = () => {
    setGDriveCredentials(null, null);
    showToast('🚪 Unlinked Google Drive account successfully.', 'info');
    setActiveModal(null);
  };


  // Flat list of all active benefits based on instances
  interface ActiveBenefit {
    cardInstance?: OwnedCardInstance;
    template?: CardTemplate;
    benefit: Benefit;
    logKey: string;
    isUsed: boolean;
    loyaltyAward?: LoyaltyAward;
  }

  const activeBenefits: ActiveBenefit[] = [];
  ownedCards.forEach((cardInstance) => {
    const template = CARDS_DB.find((t) => t.id === cardInstance.templateId);
    let benefits: Benefit[] = [];

    if (cardInstance.templateId === 'custom') {
      benefits = [...(cardInstance.customBenefits || [])];
    } else if (template) {
      benefits = [...template.benefits];
    }

    // Append card-instance specific custom offers (e.g., Amex Offers)
    if (cardInstance.instanceOffers && cardInstance.instanceOffers.length > 0) {
      benefits = [...benefits, ...cardInstance.instanceOffers];
    }

    benefits.forEach((benefit) => {
      const logKey = getLogKey(
        benefit.resetPeriod,
        cardInstance.id,
        benefit.id,
        currentDate,
        cardInstance.cardOpenDate,
        benefit.expirationDate
      );
      
      const obfuscatedKey = obfuscateKey(logKey);
      const logVal = logs[obfuscatedKey];
      const parsed = parseLogEntry(logVal);
      const isUsed = benefit.spendingLimit
        ? (parsed?.spentProgress || 0) >= benefit.spendingLimit
        : !!(parsed && parsed.resolved);

      // Dynamically compute precision date-level expiration for anniversary benefits
      let resolvedExpirationDate = benefit.expirationDate;
      if (benefit.resetPeriod === 'annual-anniversary' && cardInstance.cardOpenDate) {
        const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
        const year = currentDate.getFullYear();
        const currentAnniv = new Date(year, openDate.getMonth(), openDate.getDate());
        
        const expirationDate = currentDate < currentAnniv 
          ? currentAnniv 
          : new Date(year + 1, openDate.getMonth(), openDate.getDate());
          
        resolvedExpirationDate = expirationDate.toISOString().split('T')[0];
      }

      activeBenefits.push({
        cardInstance,
        template,
        benefit: {
          ...benefit,
          expirationDate: resolvedExpirationDate
        },
        logKey,
        isUsed,
      });
    });
  });

  // Append active standalone loyalty awards into checklist benefits cleanly!
  loyaltyAwards.forEach((award) => {
    const isCustom = award.templateId === 'custom';
    const info = isCustom ? {
      name: award.customName || 'Custom Voucher',
      brand: award.customBrand || 'Other',
      programType: award.customProgramType || 'other',
      awardType: award.customAwardType || 'other',
      value: award.customValue || 0
    } : AWARD_TEMPLATES[award.templateId];

    const usedQty = award.usedQuantity || 0;
    const remainingQty = award.quantity - usedQty;
    const isFullyUsed = usedQty === award.quantity;

    // Synthesize standard Benefit object
    const synthesizedBenefit: Benefit = {
      id: award.id,
      name: `${info.name} ${remainingQty > 1 ? `(${remainingQty}x)` : ''}`,
      description: award.notes || info.description || `${info.brand} loyalty reward certificate.`,
      value: info.value * award.quantity,
      resetPeriod: 'fixed',
      expirationDate: award.expirationDate,
      category: (info.awardType === 'fnr' || info.awardType === 'sua' || info.awardType === 'goh' || info.awardType === 'companion' || info.awardType === 'swu') 
        ? 'travel' 
        : info.awardType === 'points' ? 'shopping' : 'other'
    };

    activeBenefits.push({
      benefit: synthesizedBenefit,
      logKey: award.id,
      isUsed: isFullyUsed,
      loyaltyAward: award
    });
  });

  const getExpiredValue = (ab: ActiveBenefit): number => {
    const usedQty = ab.loyaltyAward ? (ab.loyaltyAward.usedQuantity || 0) : 0;
    const isExpired = ab.loyaltyAward
      ? (usedQty < ab.loyaltyAward.quantity && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate)
      : (ab.benefit.resetPeriod === 'fixed' && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate);
      
    if (!isExpired) return 0;
    return ab.benefit.value - getResolvedValue(ab, logs);
  };

  // Compute stats
  const totalPotentialValue = activeBenefits.reduce((sum, ab) => sum + ab.benefit.value, 0);
  const resolvedValue = Math.round(activeBenefits.reduce((sum, ab) => sum + getResolvedValue(ab, logs), 0) * 100) / 100;
  const expiredValue = Math.round(activeBenefits.reduce((sum, ab) => sum + getExpiredValue(ab), 0) * 100) / 100;
  const pendingValue = Math.round((totalPotentialValue - resolvedValue - expiredValue) * 100) / 100;
  const utilizationRate = totalPotentialValue > 0 ? Math.round((resolvedValue / totalPotentialValue) * 100) : 0;

  // Calculate the Annual Fee Anniversary Warnings (within 30 days)
  const annualFeeWarnings = useMemo(() => {
    return ownedCards
      .map((card) => {
        // Skip manually dismissed warnings
        if (dismissedWarningCardIds[card.id]) return null;

        const template = CARDS_DB.find((t) => t.id === card.templateId);
        const fee = card.annualFee !== undefined ? card.annualFee : (template?.annualFee || 0);
        // Skip free cards ($0) and cards without open date
        if (fee === 0 || !card.cardOpenDate) return null;

        const warningInfo = getAnnualFeeWarningInfo(card.cardOpenDate, currentDate);
        if (warningInfo.isWarningZone) {
          return {
            card,
            fee,
            nextAnniversaryDate: warningInfo.nextAnniversaryDate,
            daysUntil: warningInfo.daysUntil
          };
        }
        return null;
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);
  }, [ownedCards, currentDate, dismissedWarningCardIds]);

  // Calculate the Checkout Winners in active cards
  const checkoutWinners = (() => {
    if (ownedCards.length === 0) return null;

    const categories = ['dining', 'travel', 'shopping', 'entertainment'] as const;
    const winners: Record<string, { cardName: string; multiplier: number; bank: string } | null> = {
      dining: null,
      travel: null,
      shopping: null,
      entertainment: null
    };

    categories.forEach((cat) => {
      let maxVal = 0;
      let bestCard: { cardName: string; multiplier: number; bank: string } | null = null;

      ownedCards.forEach((instance) => {
        let mult = 0;
        // 1. Check if the instance has manually customized overrides
        if (instance.multipliers?.[cat] !== undefined) {
          mult = instance.multipliers[cat]!;
        } else if (instance.templateId !== 'custom') {
          // 2. Fallback to static standard template multipliers
          mult = CARD_MULTIPLIERS[instance.templateId]?.[cat] || 0;
        }
        
        if (mult > maxVal) {
          maxVal = mult;
          const template = CARDS_DB.find((t) => t.id === instance.templateId);
          bestCard = {
            cardName: instance.customName,
            multiplier: mult,
            bank: instance.bank || template?.bank || 'Card'
          };
        }
      });

      winners[cat] = bestCard;
    });

    // Check if we actually have at least one winner
    const hasWinner = Object.values(winners).some(w => w !== null);
    return hasWinner ? winners : null;
  })();

  // Calculate actual remaining, non-expired active benefits for the AI SpentAssistant (cards only)
  const remainingBenefits = activeBenefits.filter((ab) => {
    if (ab.isUsed || !ab.cardInstance) return false;
    const isExpired = ab.benefit.resetPeriod === 'fixed' && 
      ab.benefit.expirationDate && 
      new Date(ab.benefit.expirationDate + 'T00:05:00') < currentDate;
    return !isExpired;
  }) as unknown as { cardInstance: OwnedCardInstance; benefit: Benefit; logKey: string }[];



  const addOfferCard = ownedCards.find((c) => c.id === addOfferInstanceId);

  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
    
    const newMonthName = nextDate.toLocaleString('default', { month: 'long' });
    const newYear = nextDate.getFullYear();
    showToast(`⏰ Sandbox set to ${newMonthName} ${newYear}`, 'info');
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-amber-500 selection:text-slate-900 transition-colors duration-300 ${
      themeClass('bg-slate-955 text-slate-100 border-slate-900', 'bg-slate-50 text-slate-800 border-slate-200')
    }`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-10 px-4 py-4 transition-colors duration-300 ${
        themeClass('border-slate-900 bg-slate-950/80', 'border-slate-200 bg-white/80')
      }`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center shrink-0">
              <svg 
                className="w-7.5 h-7.5 shrink-0 drop-shadow-[0_2px_8px_rgba(197,160,89,0.15)]" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c5a059" />
                    <stop offset="50%" stopColor="#fdf2d5" />
                    <stop offset="100%" stopColor="#9c7a3c" />
                  </linearGradient>
                </defs>
                {/* Background Card Outline Tilted */}
                <rect 
                  x="2" 
                  y="5" 
                  width="17" 
                  height="11" 
                  rx="1.5" 
                  stroke="url(#logoGold)" 
                  strokeWidth="1.5" 
                  opacity="0.45" 
                  transform="rotate(-12 10.5 10.5)" 
                />
                {/* Foreground Card Filled with Premium Gold Gradient */}
                <rect 
                  x="4" 
                  y="7" 
                  width="17" 
                  height="11" 
                  rx="1.5" 
                  fill="url(#logoGold)" 
                />
                {/* Micro EMV Chip cutout */}
                <rect 
                  x="6" 
                  y="9" 
                  width="3" 
                  height="2.2" 
                  rx="0.4" 
                  fill="#090d16" 
                  opacity="0.9" 
                />
                {/* Micro contactless waves */}
                <path 
                  d="M 11.5 9.2 A 1.5 1.5 0 0 1 11.5 11.3 M 12.3 8.5 A 2.5 2.5 0 0 1 12.3 12" 
                  stroke="#ffffff" 
                  strokeWidth="0.65" 
                  strokeLinecap="round" 
                  opacity="0.75" 
                />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className={`text-lg font-bold tracking-tight ${themeClass('text-white', 'text-slate-900')}`}>PerkFolio</h1>
                <span className={`text-[9px] font-black uppercase tracking-widest ${themeClass('text-slate-450', 'text-slate-500')}`}>
                  • Smart Perks & Awards Portfolio
                </span>
              </div>
              <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${themeClass('text-slate-400', 'text-slate-550')}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${themeClass('bg-green-500', 'bg-green-600')}`}></span>
                <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end sm:justify-start self-end sm:self-auto animate-fade-in">
            {/* Year-End Savings Wrapped Button (Viral Growth Magnet!) */}
            {(ownedCards.length > 0 || loyaltyAwards.length > 0) && (
              <button
                onClick={() => setActiveModal('wrapped')}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-purple-600/15 border-purple-500/30 hover:border-purple-400/50 text-purple-400 hover:text-purple-300 font-extrabold text-xs transition duration-300 active:scale-90 cursor-pointer shadow-md shadow-purple-500/5 animate-pulse"
                title="View and Share your Personal Churner Savings Wrapped Poster!"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow hidden sm:block" />
                <span>Wrapped 👑</span>
              </button>
            )}

            {/* Google Drive Cloud Sync Widget */}
            <CloudSyncBanner
              syncStatus={syncStatus}
              setSyncStatus={setSyncStatus}
              gdriveEmail={gdriveEmail}
              lastSyncedTime={lastSyncedTime}
              setGDriveCredentials={setGDriveCredentials}
              handleLinkGoogleDrive={handleLinkGoogleDrive}
              handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
              showToast={showToast}
              themeClass={themeClass}
            />

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
                themeClass(
                  'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400',
                  'bg-white border-slate-250 hover:bg-slate-100 text-amber-500 shadow-sm'
                )
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Calendar Sync Button */}
            {ownedCards.length > 0 && (
              <button
                onClick={() => setActiveModal('sync')}
                className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
                  themeClass(
                    'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-500',
                    'bg-white border-slate-250 hover:bg-slate-100 text-amber-600 shadow-sm'
                  )
                }`}
                title="Sync All Calendar Reminders"
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}

            {/* Integrated Month Switcher */}
            <div className={`flex items-center rounded-full p-0.5 text-[11px] font-extrabold border ${
              themeClass('bg-slate-900 border-slate-800 text-slate-300', 'bg-slate-100 border-slate-250 text-slate-700')
            }`}>
              <button 
                type="button"
                onClick={() => adjustMonth(-1)} 
                className={`p-1.5 rounded-full transition cursor-pointer flex items-center justify-center ${themeClass('hover:bg-slate-800', 'hover:bg-slate-200')}`}
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span 
                onDoubleClick={() => {
                  setCurrentDate(new Date());
                  showToast("⏰ Sandbox reset to Today", "info");
                }}
                className="px-2 py-1 min-w-[75px] text-center font-extrabold text-[9.5px] tracking-wider uppercase cursor-pointer hover:opacity-80 active:scale-95 transition select-none"
                title="Double-click to reset back to Today"
              >
                {currentMonthStr.substring(0, 3)} {currentYear}
              </span>
              <button 
                type="button"
                onClick={() => adjustMonth(1)} 
                className={`p-1.5 rounded-full transition cursor-pointer flex items-center justify-center ${themeClass('hover:bg-slate-800', 'hover:bg-slate-200')}`}
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Stats Panel */}
        {/* Mobile Compact Stats Bar (Saves massive vertical height!) */}
        <section className="block md:hidden border rounded-2xl p-2.5 transition duration-300 mb-4 shadow-sm bg-slate-900/20 border-slate-900/30 dark:bg-slate-55/40 dark:border-slate-250/80 backdrop-blur-md">
          <div className="grid grid-cols-4 gap-1 text-center divide-x divide-slate-200/20 dark:divide-black/10">
            <div className="px-0.5">
              <p className={`text-[8px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-505')}`}>Potential</p>
              <p className={`text-xs font-black mt-0.5 ${themeClass('text-white', 'text-slate-855')}`}>${totalPotentialValue}</p>
            </div>
            <div className="px-0.5">
              <p className={`text-[8px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-505')}`}>Saved</p>
              <p className="text-xs font-black text-emerald-500 mt-0.5">${resolvedValue}</p>
            </div>
            <div className="px-0.5">
              <p className={`text-[8px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-505')}`}>Remaining</p>
              <p className="text-xs font-black text-amber-500 mt-0.5">${pendingValue}</p>
            </div>
            <div className="px-0.5">
              <p className={`text-[8px] font-extrabold uppercase tracking-widest ${themeClass('text-slate-500', 'text-slate-505')}`}>Maximized</p>
              <p className="text-xs font-black text-purple-500 dark:text-purple-400 mt-0.5">{utilizationRate}%</p>
            </div>
          </div>
        </section>

        {/* Desktop Full Cards Grid */}
        <section className="hidden md:grid grid-cols-4 gap-3 mb-6">
          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Potential Value
            </p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${themeClass('text-white', 'text-slate-900')}`}>${totalPotentialValue}</p>
          </div>

          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Resolved
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">${resolvedValue}</p>
          </div>

          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Remaining
            </p>
            <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">${pendingValue}</p>
          </div>

          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 flex items-center justify-between gap-3 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <div className="min-w-0">
              <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Maximized
              </p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${themeClass('text-white', 'text-slate-900')}`}>{utilizationRate}%</p>
            </div>
            
            <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  className={`fill-none stroke-current ${themeClass('text-white/10', 'text-slate-100')}`}
                  strokeWidth="3.5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  className="fill-none stroke-current text-purple-500 dark:text-purple-400 transition-all duration-500 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray="94.25"
                  strokeDashoffset={94.25 - (94.25 * Math.min(utilizationRate / 100, 1))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-purple-500 dark:text-purple-400">
                🎯
              </div>
            </div>
          </div>
        </section>

        {/* Tabs panel */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 border-b pb-3 sm:pb-4 ${themeClass('border-slate-900', 'border-slate-200')}`}>
          <div className={`flex gap-1 p-1 rounded-xl self-start ${themeClass('bg-slate-900/80', 'bg-slate-200/60')}`}>
            <button
              onClick={() => setActiveTab('todo')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'todo'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              Checklist ({activeBenefits.filter(b => !b.isUsed).length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              My Wallet ({ownedCards.length + loyaltyAwards.length})
            </button>
          </div>

          
        </div>

        {/* 0. Glanceable Point Multiplier Checkout Winners Row */}
        <CheckoutWinnersRow checkoutWinners={checkoutWinners} activeTab={activeTab} />

        {/* 0.5. Annual Fee Anniversary Warning Widget (Fully Conditional) */}
        <AnnualFeeWarningsWidget annualFeeWarnings={annualFeeWarnings} activeTab={activeTab} dismissWarning={dismissWarning} showToast={showToast} themeClass={themeClass} />


        {/* TAB 1: CHECKLIST VIEW */}
        {activeTab === 'todo' && (
          <section>
            {ownedCards.length === 0 && loyaltyAwards.length === 0 ? (
              <EmptyWalletState onBrowse={() => setActiveTab('cards')} themeClass={themeClass} />
            ) : (
              <ActiveChecklistTab
                activeBenefits={activeBenefits}
                logs={logs}
                currentDate={currentDate}
                activeTab={activeTab}
                themeClass={themeClass}
                updateProgressLog={handleUpdateProgressLog}
                toggleBenefit={handleChecklistToggle}
                ownedCards={ownedCards}
                loyaltyAwards={loyaltyAwards}
                isGroupedView={isGroupedView || false}
                setIsGroupedView={setIsGroupedView}
                collapsedGroups={collapsedGroups}
                setCollapsedGroups={setCollapsedGroups}
              />
            )}
          </section>
        )}

        {/* TAB 3: MY CARDS MANAGER */}
        {activeTab === 'cards' && (
          <WalletLibraryTab
            ownedCards={ownedCards}
            loyaltyAwards={loyaltyAwards}
            getCardRecoupedValue={(id) => getCardRecoupedValue(id, ownedCards, logs, currentDate)}
            handleAddCard={handleAddCard}
            handleAddCustomCard={handleAddCustomCard}
            removeInstanceOffer={removeInstanceOffer}
            setAddOfferInstanceId={setAddOfferInstanceId}
            setIsCreateModalOpen={(open) => setActiveModal(open ? 'create-card' : null)}
            setIsCreateAwardModalOpen={(open) => setActiveModal(open ? 'create-award' : null)}
            setDeleteCardInstanceId={setDeleteCardInstanceId}
            setDeleteAwardId={setDeleteAwardId}
            themeClass={themeClass}
            selectedTemplates={selectedTemplates}
            setSelectedTemplates={setSelectedTemplates}
            onEditCard={(instance) => setActiveEditInstanceId(instance.id)}
            deckSubTab={deckSubTab}
            setDeckSubTab={setDeckSubTab}
            updateAwardUsedQuantity={updateAwardUsedQuantity}
            onViewTemplateDetail={setActiveTemplateDetail}
          />
        )}
      </main>

      {/* Premium Footer: Privacy & Performance Guard declaration */}
      <footer className="mt-auto py-8 px-4 text-center space-y-3 shrink-0">
        {/* Trust Badges for Local-First reassurance */}
        <div className="flex flex-wrap justify-center items-center gap-2 max-w-2xl mx-auto">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm ${
            themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400', 'bg-slate-100/80 border-slate-200 text-slate-600')
          }`}>
            <span className="text-xs shrink-0">🛡️</span>
            <span>100% Local Data</span>
          </div>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm ${
            themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400', 'bg-slate-100/80 border-slate-200 text-slate-600')
          }`}>
            <span className="text-xs shrink-0">🚫</span>
            <span>No Plaid / No Bank Logins</span>
          </div>
          <a
            href="https://github.com/DeanChensj/cc-benefits-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400 hover:text-purple-400 hover:border-purple-900/30', 'bg-slate-100/80 border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-300')
            }`}
          >
            <span className="text-xs shrink-0">⭐</span>
            <span>Open Source on GitHub</span>
          </a>
        </div>

        <p className={`text-[9px] font-bold tracking-wider uppercase ${themeClass('text-slate-500/80', 'text-slate-450')}`}>
          💳 PerkFolio • Made with Passion for Savvy Churners
        </p>
        <p className="text-[8.5px] leading-relaxed max-w-md mx-auto opacity-70 text-slate-500 dark:text-slate-450 font-medium">
          🔒 Historical logs older than 24 months are automatically pruned to optimize loading speeds and minimize cellular data usage.
        </p>
      </footer>

      {/* Calendar Sync Modal */}
      <CalendarSyncModal 
        isOpen={activeModal === 'sync'} 
        onClose={() => setActiveModal(null)} 
        ownedCards={ownedCards}
        logs={logs}
        loyaltyAwards={loyaltyAwards}
        theme={theme}
      />

      {/* Create Custom Card Modal */}
      <CreateCardModal 
        isOpen={activeModal === 'create-card'} 
        onClose={() => setActiveModal(null)} 
        theme={theme}
        addCustomCard={handleAddCustomCard}
        getLocalDateString={getLocalDateString}
        showToast={showToast}
      />


      {/* Add Custom Offer Modal */}
      <AddOfferModal
        isOpen={!!addOfferInstanceId}
        cardName={addOfferCard ? (addOfferCard.templateId === 'custom' ? addOfferCard.customName : (CARDS_DB.find((t) => t.id === addOfferCard.templateId)?.name || 'Card')) : 'Card'}
        onClose={() => setAddOfferInstanceId(null)}
        onAdd={(offer) => {
          if (addOfferInstanceId) {
            addInstanceOffer(addOfferInstanceId, offer);
          }
        }}
        theme={theme}
        showToast={showToast}
      />

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteCardInstanceId}
        cardName={ownedCards.find((c) => c.id === deleteCardInstanceId)?.templateId === 'custom' 
          ? (ownedCards.find((c) => c.id === deleteCardInstanceId)?.customName || 'Card') 
          : (CARDS_DB.find((t) => t.id === (ownedCards.find((c) => c.id === deleteCardInstanceId)?.templateId || ''))?.name || 'Card')}
        onConfirm={handleConfirmRemoveCard}
        onCancel={() => setDeleteCardInstanceId(null)}
        theme={theme}
      />

      {/* Standalone Loyalty Voucher Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteAwardId}
        title="Delete Standalone Voucher?"
        message="Are you sure you want to delete this loyalty award voucher? This action is permanent and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (deleteAwardId) {
            deleteLoyaltyAward(deleteAwardId);
            setDeleteAwardId(null);
            showToast('🗑️ Standalone voucher deleted successfully.', 'warning');
          }
        }}
        onCancel={() => setDeleteAwardId(null)}
        theme={theme}
        type="danger"
      />

      {/* Wallet AI Assistant Drawer */}
      <WalletAiAssistant remainingBenefits={remainingBenefits} logs={logs} theme={theme} showToast={showToast} ownedCards={ownedCards} loyaltyAwards={loyaltyAwards} />

      {/* Google Drive Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'disconnect-gdrive'}
        title="Disconnect Google Drive?"
        message="Are you sure you want to disconnect and unlink Google Drive? Your local data will remain intact, but automated cloud synchronization will cease."
        confirmText="Disconnect"
        cancelText="Cancel"
        onConfirm={handleConfirmDisconnectGoogleDrive}
        onCancel={() => setActiveModal(null)}
        theme={theme}
        type="warning"
      />

      {/* Wipe App Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={activeModal === 'wipe'}
        title="Wipe All App Data?"
        message="Are you absolutely sure you want to reset all card instances and checklist logs? This action is permanent and cannot be undone."
        confirmText="Wipe Data"
        cancelText="Keep Data"
        onConfirm={() => {
          resetAll();
          setActiveModal(null);
          showToast('🗑️ All card data and logs have been wiped.', 'warning');
        }}
        onCancel={() => setActiveModal(null)}
        theme={theme}
        type="danger"
      />

      {/* Standalone Loyalty Award Vouchers Constructor Modal */}
      <CreateAwardModal
        isOpen={activeModal === 'create-award'}
        onClose={() => setActiveModal(null)}
        themeClass={themeClass}
      />

      {/* Premium Savings Wrapped Poster Modal */}
      <SavingsWrappedModal
        isOpen={activeModal === 'wrapped'}
        onClose={() => setActiveModal(null)}
        ownedCards={ownedCards}
        loyaltyAwards={loyaltyAwards}
        resolvedValue={resolvedValue}
        themeClass={themeClass}
      />



      {/* Floating Sticky Batch Action Bar */}
      {selectedTemplates.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[340px] max-w-[calc(100vw-32px)] animate-scale-up">
          <div className={`p-3 border rounded-2xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md ${
            themeClass('bg-slate-900/95 border-slate-800/85 text-white shadow-slate-950/50', 'bg-white/95 border-slate-200/80 text-slate-800 shadow-slate-500/20')
          }`}>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">Batch Selection</p>
              <p className="text-xs font-black truncate mt-0.5">{selectedTemplates.length} Card Templates</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setSelectedTemplates([])}
                className={`px-3 py-2 rounded-xl text-[10px] font-extrabold border transition cursor-pointer active:scale-95 ${
                  themeClass('bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-600')
                }`}
              >
                Clear
              </button>
              <button
                onClick={() => {
                  addCardsBatch(selectedTemplates);
                  setSelectedTemplates([]);
                  setDeckSubTab('cards');
                  localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
                  showToast(`🎉 Successfully added ${selectedTemplates.length} cards to your Wallet!`, 'success');
                }}
                className="px-4.5 py-2 rounded-xl text-[10px] font-extrabold bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white transition cursor-pointer active:scale-95 shadow-md shadow-purple-500/20"
              >
                Add to Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      <EditCardModal
        isOpen={!!activeEditInstanceId}
        instance={activeEditInstance}
        onClose={() => setActiveEditInstanceId(null)}
        updateCardMultipliers={updateCardMultipliers}
        toggleSignupBonus={toggleSignupBonus}
        updateSignupBonusValue={updateSignupBonusValue}
        setCardOpenDate={setCardOpenDate}
        renameCard={renameCard}
        themeClass={themeClass}
      />

      {/* Card Detail Popover Drawer */}
      <CardDetailDrawer 
        isOpen={!!activeTemplateDetail}
        card={activeTemplateDetail}
        onClose={() => setActiveTemplateDetail(null)}
        onAdd={() => {
          handleAddCard(activeTemplateDetail ? activeTemplateDetail.id : '');
          setActiveTemplateDetail(null);
        }}
        theme={theme}
      />

      {/* Premium Floating Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} theme={theme} onUndo={toast.onUndo} />
      )}
    </div>
  );
}

export default App;
