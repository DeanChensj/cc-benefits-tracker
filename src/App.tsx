import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
// Meticulously audited and verified PWA release build with dynamic re-auth and contrast fixes
import { CARDS_DB, CARD_MULTIPLIERS, AWARD_TEMPLATES } from './data/cards.db';
import type { CardTemplate, Benefit, LoyaltyAward } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { translations, formatCardNameForToast } from './utils/i18n';
import { WalletAiAssistant } from './components/WalletAiAssistant';
import { ChurningStatsDrawer } from './components/ChurningStatsDrawer';
import { CardDetailDrawer } from './components/CardDetailDrawer';
import { Toast } from './components/Toast';
import { EmptyWalletState } from './components/EmptyWalletState';
import { AnnualFeeWarningsWidget } from './components/AnnualFeeWarningsWidget';
import { CloudSyncBanner } from './components/CloudSyncBanner';
import { ActiveChecklistTab } from './components/ActiveChecklistTab';
import { WalletLibraryTab } from './components/WalletLibraryTab';
import { getLocalDateString, getAnnualFeeWarningInfo } from './utils/dateUtils';
import { getResolvedValue, getCardRecoupedValue } from './utils/valuationUtils';
import { parseLogEntry } from './utils/logUtils';
import { obfuscateKey } from './utils/cryptoUtils';
import { loadGoogleGsiScript, requestGDriveToken, fetchUserEmail } from './utils/gdrive';

// Lazy load modals to reduce initial bundle size
const CalendarSyncModal = lazy(() => import('./components/CalendarSyncModal').then(m => ({ default: m.CalendarSyncModal })));
const CreateCardModal = lazy(() => import('./components/CreateCardModal').then(m => ({ default: m.CreateCardModal })));
const CreateAwardModal = lazy(() => import('./components/CreateAwardModal').then(m => ({ default: m.CreateAwardModal })));
const AddOfferModal = lazy(() => import('./components/AddOfferModal').then(m => ({ default: m.AddOfferModal })));
const EditCardModal = lazy(() => import('./components/EditCardModal').then(m => ({ default: m.EditCardModal })));
const EditAwardModal = lazy(() => import('./components/EditAwardModal').then(m => ({ default: m.EditAwardModal })));
const DeleteConfirmModal = lazy(() => import('./components/DeleteConfirmModal').then(m => ({ default: m.DeleteConfirmModal })));
const ConfirmationModal = lazy(() => import('./components/ConfirmationModal').then(m => ({ default: m.ConfirmationModal })));
const SavingsWrappedModal = lazy(() => import('./components/SavingsWrappedModal').then(m => ({ default: m.SavingsWrappedModal })));
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
    updateCardPointCurrency,
    toggleSignupBonus,
    updateSignupBonusValue,
    toggleLoyaltyAward,
    deleteLoyaltyAward,
    updateAwardUsedQuantity,
    pruneExpiredLogs,
    resetAll,
    language,
    toggleLanguage
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;
  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const lastSyncTimeRef = useRef<number>(0);

  // Date to evaluate states against (defaults to current system date)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'todo' | 'cards'>(() => {
    const hasCards = useCardStore.getState().ownedCards.length > 0;
    if (!hasCards) return 'cards';
    return (localStorage.getItem('cc-tracker-active-tab') as 'todo' | 'cards') || 'todo';
  });
  const [deckSubTab, setDeckSubTab] = useState<'cards' | 'awards' | 'templates'>(() => {
    const hasCards = useCardStore.getState().ownedCards.length > 0;
    if (!hasCards) return 'templates';
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
  const [activeEditAwardId, setActiveEditAwardId] = useState<string | null>(null);
  const activeEditAward = loyaltyAwards.find((a) => a.id === activeEditAwardId) || null;

  const lastActionRef = useRef<{ logKey: string; prevResolved: boolean; prevSpentProgress?: number } | null>(null);

  const [dismissedWarningCardIds, setDismissedWarningCardIds] = useState<Record<string, boolean>>({});
  const [isChurningDrawerOpen, setIsChurningDrawerOpen] = useState(false);
  
  const dismissWarning = (cardId: string) => {
    setDismissedWarningCardIds((prev) => ({
      ...prev,
      [cardId]: true
    }));
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'success'
  ) => {
    setToast({ message, type });
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

    showToast(
      `${t('resolveAction')} "${ab.benefit.name}"`,
      'success'
    );
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

    showToast(
      language === 'zh' ? `📈 消费进度已更新为 $${spent}` : `Progress updated to $${spent}`, 
      'success'
    );
  };

  const handleAddCard = (templateId: string) => {
    const template = CARDS_DB.find((t) => t.id === templateId);
    const cardName = template ? template.name : 'Card';
    addCard(templateId);
    setDeckSubTab('cards');
    localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
    showToast(t('toastCardAdded').replace('{name}', formatCardNameForToast(cardName)));
  };


  const handleConfirmRemoveCard = () => {
    if (!deleteCardInstanceId) return;
    const instance = ownedCards.find((c) => c.id === deleteCardInstanceId);
    if (instance) {
      const template = CARDS_DB.find((t) => t.id === instance.templateId);
      const cardName = instance.templateId === 'custom' ? instance.customName : (template?.name || 'Card');
      removeCard(deleteCardInstanceId);
      showToast(t('toastCardRemoved').replace('{name}', formatCardNameForToast(cardName)), 'error');
    }
    setDeleteCardInstanceId(null);
  };

  const handleAddCustomCard = (card: Omit<OwnedCardInstance, 'id'>) => {
    addCustomCard(card);
    setDeckSubTab('cards');
    localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
    showToast(t('toastCardCreated').replace('{name}', card.customName));
  };

  const currentMonthStr = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Load Google Identity Services script dynamically on mount
  useEffect(() => {
    // Self-Healing Migration: Automatically heal stored point valuations defaults
    const storedValuations = useCardStore.getState().pointValuations;
    if (storedValuations) {
      if (storedValuations['chase-ur'] === 2.0 || storedValuations['chase-ur'] === 1.8) {
        useCardStore.getState().updatePointValuation('chase-ur', 1.6);
      }
      if (storedValuations['amex-mr'] === 2.0 || storedValuations['amex-mr'] === 1.8) {
        useCardStore.getState().updatePointValuation('amex-mr', 1.6);
      }
      if (storedValuations['hyatt'] === 2.1) {
        useCardStore.getState().updatePointValuation('hyatt', 1.4);
      }
      
      // Dynamically populate missing new point currencies
      const newDefaults: Record<string, number> = {
        'hilton': 0.5,
        'aa-miles': 1.5,
        'ua-miles': 1.3,
        'delta-miles': 1.2
      };
      Object.entries(newDefaults).forEach(([currency, defVal]) => {
        if (storedValuations[currency] === undefined) {
          useCardStore.getState().updatePointValuation(currency, defVal);
        }
      });
    }



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
      showToast(t('toastGDriveConnected'));
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      showToast(t('toastGDriveFailed'), 'error');
    }
  };

  const handleDisconnectGoogleDrive = () => {
    setActiveModal('disconnect-gdrive');
  };

  const handleConfirmDisconnectGoogleDrive = () => {
    setGDriveCredentials(null, null);
    showToast(t('toastGDriveUnlinked'), 'info');
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

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const activeBenefits = useMemo(() => {
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

      // Dynamically compute precision date-level expiration for all reset periods timezone-safely!
      let resolvedExpirationDate = benefit.expirationDate;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-11

      if (benefit.resetPeriod === 'monthly') {
        const lastDay = new Date(year, month + 1, 0);
        resolvedExpirationDate = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
      } else if (benefit.resetPeriod === 'quarterly') {
        const qEndMonth = Math.floor(month / 3) * 3 + 2;
        const lastDay = new Date(year, qEndMonth + 1, 0);
        resolvedExpirationDate = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
      } else if (benefit.resetPeriod === 'semi-annual') {
        const saEndMonth = month <= 5 ? 6 : 12;
        const lastDay = new Date(year, saEndMonth, 0);
        resolvedExpirationDate = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
      } else if (benefit.resetPeriod === 'annual-calendar') {
        resolvedExpirationDate = `${year}-12-31`;
      } else if (benefit.resetPeriod === 'annual-anniversary' && cardInstance.cardOpenDate) {
        const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
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
    const isFullyUsed = usedQty >= 1;

    // Synthesize standard Benefit object
    const synthesizedBenefit: Benefit = {
      id: award.id,
      name: info.name,
      description: award.notes || info.description || `${info.brand} loyalty reward certificate.`,
      value: info.value,
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
  return activeBenefits;
}, [ownedCards, loyaltyAwards, logs, currentDate]);

  const getExpiredValue = (ab: ActiveBenefit): number => {
    const usedQty = ab.loyaltyAward ? (ab.loyaltyAward.usedQuantity || 0) : 0;
    const isExpired = ab.loyaltyAward
      ? (usedQty < 1 && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate)
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

  // Calculate the Checkout Winners in active cards using Points Valuations & ROS% (Return-on-Spend)
  const pointValuations = useCardStore((state) => state.pointValuations || {});

  const checkoutWinners = useMemo(() => {
    if (ownedCards.length === 0) return null;

    const categories = ['dining', 'travel', 'shopping', 'entertainment'] as const;
    const winners: Record<string, { cardName: string; multiplier: number; ros: number; currency: string; bank: string } | null> = {
      dining: null,
      travel: null,
      shopping: null,
      entertainment: null
    };

    categories.forEach((cat) => {
      let maxRos = 0;
      let bestCard: { cardName: string; multiplier: number; ros: number; currency: string; bank: string } | null = null;

      ownedCards.forEach((instance) => {
        let mult = 0;
        // 1. Check if the instance has manually customized overrides
        if (instance.multipliers?.[cat] !== undefined) {
          mult = instance.multipliers[cat]!;
        } else if (instance.templateId !== 'custom') {
          // 2. Fallback to static standard template multipliers
          mult = CARD_MULTIPLIERS[instance.templateId]?.[cat] || 0;
        }

        // 3. Resolve point type statically & calculate return (cpp)
        const template = CARDS_DB.find((t) => t.id === instance.templateId);
        const currency = instance.pointCurrency || (template?.pointCurrency || 'cash');
        const cpp = pointValuations[currency] !== undefined ? pointValuations[currency] : 1.0;
        const ros = mult * cpp;

        // We track and recommend strictly by ROS% (Return on Spend)
        if (ros > maxRos) {
          maxRos = ros;
          bestCard = {
            cardName: instance.customName,
            multiplier: mult,
            ros,
            currency,
            bank: instance.bank || template?.bank || 'Card'
          };
        }
      });

      winners[cat] = bestCard;
    });

    // Check if we actually have at least one winner
    const hasWinner = Object.values(winners).some(w => w !== null);
    return hasWinner ? winners : null;
  }, [ownedCards, pointValuations]);

  // Calculate actual remaining, non-expired active benefits for the AI SpentAssistant (cards only)
  const remainingBenefits = useMemo(() => {
    return activeBenefits.filter((ab) => {
      if (ab.isUsed || !ab.cardInstance) return false;
      const isExpired = ab.benefit.resetPeriod === 'fixed' && 
        ab.benefit.expirationDate && 
        new Date(ab.benefit.expirationDate + 'T00:05:00') < currentDate;
      return !isExpired;
    }) as unknown as { cardInstance: OwnedCardInstance; benefit: Benefit; logKey: string }[];
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [activeBenefits, currentDate]);



  const addOfferCard = ownedCards.find((c) => c.id === addOfferInstanceId);

  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
    
    const newMonthName = nextDate.toLocaleString('default', { month: 'long' });
    const newYear = nextDate.getFullYear();
    showToast(t('toastSandboxSet').replace('{year}', String(newYear)).replace('{month}', newMonthName), 'info');
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-amber-500 selection:text-slate-900 transition-colors duration-300 ${
      themeClass('bg-zen-dark text-slate-100 border-slate-900', 'bg-zen-light text-slate-800 border-slate-200')
    }`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-10 px-4 py-4 transition-colors duration-300 ${
        themeClass('border-slate-900 bg-zen-dark-card/80', 'border-slate-200 bg-zen-light-card/80')
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
                <span className={`text-[9px] font-black uppercase tracking-widest ${themeClass('text-slate-455', 'text-slate-500')}`}>
                  {t('brandSub')}
                </span>
              </div>
              <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${themeClass('bg-green-500', 'bg-green-600')}`}></span>
                <span>{t('today')}: {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end sm:justify-start self-end sm:self-auto animate-fade-in">
            {/* Year-End Savings Wrapped Button (Viral Growth Magnet!) */}
            {(ownedCards.length > 0 || loyaltyAwards.length > 0) && (
              <button
                onClick={() => setActiveModal('wrapped')}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-purple-600/15 border-purple-500/30 hover:border-purple-400/50 text-purple-400 hover:text-purple-300 font-extrabold text-xs transition duration-300 active:scale-90 cursor-pointer shadow-md shadow-purple-500/5 animate-pulse"
                title={t('wrapped')}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow hidden sm:block" />
                <span>{t('wrapped')}</span>
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
                  'bg-white border-slate-250 hover:bg-slate-100 text-amber-505 shadow-sm'
                )
              }`}
              title={theme === 'dark' ? t('toggleLightMode') : t('toggleDarkMode')}
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
                title={t('syncReminders')}
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
                  showToast(t('toastSandboxReset'), 'info');
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

      <main className="max-w-4xl mx-auto px-4 pt-3 sm:pt-6 pb-8">
        
        {/* 100% Unified Responsive Stats Panel - Single Row on Mobile */}
        <section className="grid grid-cols-4 gap-1.5 sm:gap-3 mb-2 sm:mb-6">
          {/* Card 1: Potential Value */}
          <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 text-center sm:text-left flex flex-col justify-between min-h-[55px] sm:min-h-0 sm:block ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[7.5px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <DollarSign className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
              {t('potentialValue')}
            </p>
            <p className={`text-xs sm:text-xl font-black ${themeClass('text-white', 'text-slate-900')}`}>${totalPotentialValue}</p>
          </div>

          {/* Card 2: Resolved */}
          <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 text-center sm:text-left flex flex-col justify-between min-h-[55px] sm:min-h-0 sm:block ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[7.5px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 hidden sm:inline" />
              {t('resolved')}
            </p>
            <p className={`text-xs sm:text-xl font-black text-emerald-500`}>${resolvedValue}</p>
          </div>

          {/* Card 3: Remaining */}
          <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 text-center sm:text-left flex flex-col justify-between min-h-[55px] sm:min-h-0 sm:block ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[7.5px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
              <Clock className="w-3.5 h-3.5 text-amber-500 hidden sm:inline" />
              {t('remaining')}
            </p>
            <p className={`text-xs sm:text-xl font-black text-amber-500`}>${pendingValue}</p>
          </div>

          {/* Card 4: Maximized */}
          <div className={`border rounded-xl p-1.5 sm:p-4 transition duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 min-h-[55px] sm:min-h-0 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <div className="text-center sm:text-left flex-grow flex flex-col justify-between sm:justify-start">
              <p className={`text-[7.5px] sm:text-xs font-medium uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                <Sparkles className="w-3.5 h-3.5 text-purple-500 hidden sm:inline" />
                {t('maximized')}
              </p>
              <p className={`text-xs sm:text-xl font-black ${themeClass('text-white', 'text-slate-900')}`}>{utilizationRate}%</p>
            </div>
            
            <div className="relative w-8 h-8 shrink-0 items-center justify-center hidden sm:flex">
              <svg className="w-8 h-8 transform -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  className={`fill-none stroke-current ${themeClass('text-white/10', 'text-slate-100')}`}
                  strokeWidth="3"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  className="fill-none stroke-current text-purple-500 dark:text-purple-400 transition-all duration-500 ease-out"
                  strokeWidth="3"
                  strokeDasharray="75.39"
                  strokeDashoffset={75.39 - (75.39 * Math.min(utilizationRate / 100, 1))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-purple-500 dark:text-purple-400">
                🎯
              </div>
            </div>
          </div>
        </section>

        {/* Tabs panel */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2 sm:mb-6 border-b pb-2 sm:pb-4 ${themeClass('border-slate-900', 'border-slate-200')}`}>
          <div className={`flex gap-1 p-1 rounded-xl border transition-colors duration-300 self-start ${
            themeClass('bg-zen-dark-card border-slate-850', 'bg-slate-200/50 border-slate-300/60 shadow-inner')
          }`}>
            <button
              onClick={() => setActiveTab('todo')}
              className={`px-4 py-2 text-sm font-extrabold rounded-lg transition-all duration-250 cursor-pointer ${
                activeTab === 'todo'
                  ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm')
                  : themeClass('text-slate-300 hover:text-slate-50 hover:bg-slate-800/40', 'text-slate-500 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              {t('checklist')} ({activeBenefits.filter(b => !b.isUsed).length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-sm font-extrabold rounded-lg transition-all duration-250 cursor-pointer ${
                activeTab === 'cards'
                  ? themeClass('bg-slate-100 hover:bg-white text-slate-950 shadow-md', 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm')
                  : themeClass('text-slate-300 hover:text-slate-50 hover:bg-slate-800/40', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              {t('myWallet')} ({ownedCards.length + loyaltyAwards.length})
            </button>
          </div>

          
        </div>



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
            removeInstanceOffer={removeInstanceOffer}
            setAddOfferInstanceId={setAddOfferInstanceId}
            setIsCreateModalOpen={(open) => setActiveModal(open ? 'create-card' : null)}
            setIsCreateAwardModalOpen={(open) => setActiveModal(open ? 'create-award' : null)}
            setDeleteCardInstanceId={setDeleteCardInstanceId}
            setDeleteAwardId={setDeleteAwardId}
            onWipe={() => setActiveModal('wipe')}
            themeClass={themeClass}
            selectedTemplates={selectedTemplates}
            setSelectedTemplates={setSelectedTemplates}
            onEditCard={(instance) => setActiveEditInstanceId(instance.id)}
            onEditAward={(award) => setActiveEditAwardId(award.id)}
            deckSubTab={deckSubTab}
            setDeckSubTab={setDeckSubTab}
            updateAwardUsedQuantity={updateAwardUsedQuantity}
            onViewTemplateDetail={setActiveTemplateDetail}
            checkoutWinners={checkoutWinners}
            setIsChurningDrawerOpen={setIsChurningDrawerOpen}
          />
        )}
      </main>

      {/* Premium Footer: Privacy & Performance Guard declaration */}
      <footer className="mt-auto pt-8 pb-24 sm:pb-8 px-4 text-center space-y-3 shrink-0">
        {/* Trust Badges for Local-First reassurance */}
        <div className="flex flex-wrap justify-center items-center gap-2 max-w-2xl mx-auto">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm ${
            themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400', 'bg-slate-100/80 border-slate-200 text-slate-600')
          }`}>
            <span>{t('footerLocalData')}</span>
          </div>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm ${
            themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400', 'bg-slate-100/80 border-slate-200 text-slate-600')
          }`}>
            <span>{t('footerNoPlaid')}</span>
          </div>
          <a
            href="https://github.com/DeanChensj/cc-benefits-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold border shadow-sm transition hover:scale-[1.02] cursor-pointer ${
              themeClass('bg-slate-900/50 border-slate-850/60 text-slate-400 hover:text-purple-400 hover:border-purple-900/30', 'bg-slate-100/80 border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-300')
            }`}
          >
            <span>{t('footerGithub')}</span>
          </a>
        </div>

        <p className={`text-[9px] font-bold tracking-wider uppercase ${themeClass('text-slate-500/80', 'text-slate-455')}`}>
          {t('footerPassion')}
        </p>
        {/* Footer language selector */}
        <div className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold tracking-wide select-none flex items-center justify-center gap-1.5 mt-1 mb-1">
          <span>🌐 Language:</span>
          {language === 'zh' ? (
            <>
              <span className="text-emerald-500 font-bold">简体中文</span>
              <span className="opacity-30">•</span>
              <button type="button" onClick={toggleLanguage} className="hover:text-purple-400 cursor-pointer underline">English</button>
            </>
          ) : (
            <>
              <button type="button" onClick={toggleLanguage} className="hover:text-purple-400 cursor-pointer underline">简体中文</button>
              <span className="opacity-30">•</span>
              <span className="text-emerald-500 font-bold">English</span>
            </>
          )}
        </div>
        <p className="text-[8.5px] leading-relaxed max-w-md mx-auto opacity-70 text-slate-500 dark:text-slate-450 font-medium">
          {t('footerPruneDesc')}
        </p>
      </footer>

      <Suspense fallback={null}>
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
          title={language === 'zh' ? '确定注销并删除此房券/卡券吗？' : 'Delete Standalone Voucher?'}
          message={language === 'zh' ? '此操作为永久操作，将把卡券从钱包和日历提醒中彻底抹除，且无法撤销。' : 'Are you sure you want to delete this loyalty award voucher? This action is permanent and cannot be undone.'}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          onConfirm={() => {
            if (deleteAwardId) {
              deleteLoyaltyAward(deleteAwardId);
              setDeleteAwardId(null);
              showToast(t('toastVoucherDeleted'), 'error');
            }
          }}
          onCancel={() => setDeleteAwardId(null)}
          theme={theme}
          type="danger"
        />

        {/* Google Drive Disconnect Confirmation Modal */}
        <ConfirmationModal
          isOpen={activeModal === 'disconnect-gdrive'}
          title={language === 'zh' ? '断开与 Google Drive 的云同步连接？' : 'Disconnect Google Drive?'}
          message={language === 'zh' ? '确定要断开与云端的连接吗？您的本地数据会完好保存，但自动云备份将停止。' : 'Are you sure you want to disconnect and unlink Google Drive? Your local data will remain intact, but automated cloud synchronization will cease.'}
          confirmText={language === 'zh' ? '确认断开' : 'Disconnect'}
          cancelText={t('cancel')}
          onConfirm={handleConfirmDisconnectGoogleDrive}
          onCancel={() => setActiveModal(null)}
          theme={theme}
          type="warning"
        />

        {/* Wipe App Data Confirmation Modal */}
        <ConfirmationModal
          isOpen={activeModal === 'wipe'}
          title={language === 'zh' ? '🚨 确定要清空并全盘重置应用数据吗？' : 'Wipe All App Data?'}
          message={language === 'zh' ? '警告：此操作将永久抹除您的全部卡包组合、自定义福利和历史打卡日志。本操作不可逆！' : 'Are you absolutely sure you want to reset all card instances and checklist logs? This action is permanent and cannot be undone.'}
          confirmText={language === 'zh' ? '全盘抹除数据' : 'Wipe Data'}
          cancelText={language === 'zh' ? '保留卡包数据' : 'Keep Data'}
          onConfirm={() => {
            resetAll();
            setActiveModal(null);
            showToast(t('toastDataWiped'), 'warning');
          }}
          onCancel={() => setActiveModal(null)}
          theme={theme}
          type="danger"
        />
      </Suspense>

      {/* Wallet AI Assistant Drawer */}
      <WalletAiAssistant remainingBenefits={remainingBenefits} logs={logs} theme={theme} showToast={showToast} ownedCards={ownedCards} loyaltyAwards={loyaltyAwards} />

      <Suspense fallback={null}>
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
          expiredValue={expiredValue}
          themeClass={themeClass}
          theme={theme}
        />
      </Suspense>



      {/* Floating Sticky Batch Action Bar */}
      {selectedTemplates.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[340px] max-w-[calc(100vw-32px)] animate-scale-up">
          <div className={`p-3 border rounded-2xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md ${
            themeClass('bg-slate-900/95 border-slate-800/85 text-white shadow-slate-950/50', 'bg-white/95 border-slate-200/80 text-slate-800 shadow-slate-500/20')
          }`}>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">{t('batchSelection')}</p>
              <p className="text-xs font-black truncate mt-0.5">{selectedTemplates.length} {language === 'zh' ? t('bankTemplatesSuffix') : t('bankTemplatesSuffix')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setSelectedTemplates([])}
                className={`px-3 py-2 rounded-xl text-[10px] font-extrabold border transition cursor-pointer active:scale-95 ${
                  themeClass('bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-600')
                }`}
              >
                {t('clearSelection')}
              </button>
              <button
                onClick={() => {
                  addCardsBatch(selectedTemplates);
                  setSelectedTemplates([]);
                  setDeckSubTab('cards');
                  localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
                  showToast(t('toastBatchAdded').replace('{count}', String(selectedTemplates.length)), 'success');
                }}
                className="px-4.5 py-2 rounded-xl text-[10px] font-extrabold bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white transition cursor-pointer active:scale-95 shadow-md shadow-purple-500/20"
              >
                {t('addToWallet')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <EditCardModal
          isOpen={!!activeEditInstanceId}
          instance={activeEditInstance}
          onClose={() => setActiveEditInstanceId(null)}
          updateCardMultipliers={updateCardMultipliers}
          updateCardPointCurrency={updateCardPointCurrency}
          toggleSignupBonus={toggleSignupBonus}
          updateSignupBonusValue={updateSignupBonusValue}
          setCardOpenDate={setCardOpenDate}
          renameCard={renameCard}
          themeClass={themeClass}
          theme={theme}
        />

        <EditAwardModal
          isOpen={!!activeEditAwardId}
          award={activeEditAward}
          onClose={() => setActiveEditAwardId(null)}
          themeClass={themeClass}
        />
      </Suspense>

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
      <ChurningStatsDrawer
        isOpen={isChurningDrawerOpen}
        onClose={() => setIsChurningDrawerOpen(false)}
        ownedCards={ownedCards}
        theme={theme}
      />

      {/* 🎨 Tailwind CSS Theme Safelist Force-compiler block */}
      <div className="hidden from-blue-700 to-indigo-900 from-blue-800 from-sky-900 via-indigo-950 to-black from-blue-600 to-sky-900 from-slate-900 from-blue-500 to-indigo-700" />

      {toast && (
        <Toast message={toast.message} type={toast.type} theme={theme} />
      )}
    </div>
  );
}

export default App;
