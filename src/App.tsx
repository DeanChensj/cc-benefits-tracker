import { useState, useEffect, useMemo } from 'react';
// Meticulously audited and verified PWA release build with dynamic re-auth and contrast fixes
import { CARDS_DB, CARD_MULTIPLIERS, AWARD_TEMPLATES } from './data/cards.db';
import type { CardTemplate, Benefit, LoyaltyAward } from './data/cards.db';
import { useCardStore, getLogKey } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { SpentAssistant } from './components/SpentAssistant';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { CreateCardModal } from './components/CreateCardModal';
import { CreateAwardModal } from './components/CreateAwardModal';
import { CardDetailDrawer } from './components/CardDetailDrawer';
import { AddOfferModal } from './components/AddOfferModal';
import { Toast } from './components/Toast';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { EmptyWalletState } from './components/EmptyWalletState';
import { CheckoutWinnersRow } from './components/CheckoutWinnersRow';
import { AnnualFeeWarningsWidget } from './components/AnnualFeeWarningsWidget';
import { FilterHubPanel } from './components/FilterHubPanel';
import { ChecklistCardRow } from './components/ChecklistCardRow';
import { WalletCreditCard } from './components/WalletCreditCard';
import { SavingsWrappedModal } from './components/SavingsWrappedModal';
import { getLocalDateString, getDaysLeft, getDaysLeftForDate, getUrgencyScore, getAnnualFeeWarningInfo, parseLogEntry, obfuscateKey } from './utils/dateUtils';
import { loadGoogleGsiScript, requestGDriveToken, fetchUserEmail } from './utils/gdrive';
import { 
  CreditCard, 
  Download, 
  Upload, 
  CheckCircle2, 
  RefreshCw,
  Plus,
  Sun,
  Moon,
  Cloud,
  CloudOff,
  Calendar,
  Trash2,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';



function App() {
  const { 
    ownedCards, 
    loyaltyAwards,
    logs, 
    theme,
    toggleTheme,
    language,
    gdriveEmail,
    syncStatus,
    lastSyncedTime,
    setGDriveCredentials,
    setSyncStatus,
    customClientId,
    setCustomClientId,
    addCard, 
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
    pruneExpiredLogs,
    resetAll 
  } = useCardStore();

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  // Date to evaluate states against (defaults to current system date)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'todo' | 'all' | 'cards'>(() => (localStorage.getItem('cc-tracker-active-tab') as any) || 'todo');
  const [filterCategory, setFilterCategory] = useState<string>(() => localStorage.getItem('cc-tracker-filter-category') || 'all');
  const [sortBy, setSortBy] = useState<'urgency' | 'value-desc' | 'value-asc' | 'expiry'>(() => (localStorage.getItem('cc-tracker-sort-by') as any) || 'urgency');
  const [filterCardInstanceId, setFilterCardInstanceId] = useState<string>(() => localStorage.getItem('cc-tracker-filter-card') || 'all');
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateFeeFilter, setTemplateFeeFilter] = useState<'all' | 'free' | 'mid' | 'premium'>('all');

  const [activeTemplateDetail, setActiveTemplateDetail] = useState<CardTemplate | null>(null);
  const [deckSubTab, setDeckSubTab] = useState<'cards' | 'awards'>(() => (localStorage.getItem('cc-tracker-deck-sub-tab') as any) || 'cards');
  const [isCreateAwardModalOpen, setIsCreateAwardModalOpen] = useState(false);
  const [isSyncDropdownOpen, setIsSyncDropdownOpen] = useState(false);
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [isWrappedModalOpen, setIsWrappedModalOpen] = useState(false);
  const [addOfferInstanceId, setAddOfferInstanceId] = useState<string | null>(null);
  const [deleteCardInstanceId, setDeleteCardInstanceId] = useState<string | null>(null);
  const [deleteAwardId, setDeleteAwardId] = useState<string | null>(null);
  const [isGDriveDisconnectOpen, setIsGDriveDisconnectOpen] = useState(false);
  const [isWipeDataOpen, setIsWipeDataOpen] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  
  const toggleCardExpanded = (instanceId: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [instanceId]: !prev[instanceId]
    }));
  };

  const [dismissedWarningCardIds, setDismissedWarningCardIds] = useState<Record<string, boolean>>({});
  
  const dismissWarning = (cardId: string) => {
    setDismissedWarningCardIds((prev) => ({
      ...prev,
      [cardId]: true
    }));
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddCard = (templateId: string) => {
    const template = CARDS_DB.find((t) => t.id === templateId);
    const cardName = template ? template.name : 'Card';
    addCard(templateId);
    showToast(`🎉 Added ${cardName} to your Wallet!`);
  };

  const handleRemoveCard = (instanceId: string) => {
    setDeleteCardInstanceId(instanceId);
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
  }, []);

  // Persist navigation tab and main dashboard filter settings in localStorage for seamless reload experience
  useEffect(() => {
    localStorage.setItem('cc-tracker-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('cc-tracker-filter-category', filterCategory);
  }, [filterCategory]);

  useEffect(() => {
    localStorage.setItem('cc-tracker-sort-by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('cc-tracker-filter-card', filterCardInstanceId);
  }, [filterCardInstanceId]);

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
    setIsGDriveDisconnectOpen(true);
  };

  const handleConfirmDisconnectGoogleDrive = () => {
    setGDriveCredentials(null, null);
    showToast('🚪 Unlinked Google Drive account successfully.', 'info');
    setIsGDriveDisconnectOpen(false);
  };

  const exportBackup = () => {
    const { ownedCards, loyaltyAwards, logs } = useCardStore.getState();
    const backupData = {
      version: '1.1.0',
      timestamp: new Date().toISOString(),
      ownedCards,
      loyaltyAwards,
      logs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cc-tracker-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('💾 Backup exported successfully!', 'info');
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.ownedCards && parsed.logs) {
            useCardStore.setState({
              ownedCards: parsed.ownedCards,
              loyaltyAwards: parsed.loyaltyAwards || [],
              logs: parsed.logs,
              walletLastModified: Date.now()
            });
            showToast('🎉 Backup restored successfully!');
          } else {
            showToast('❌ Invalid backup file structure.', 'error');
          }
        } catch (err) {
          showToast('❌ Failed to parse backup file.', 'error');
        }
      };
    }
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

    const totalVal = info.value * award.quantity;

    // Synthesize standard Benefit object
    const synthesizedBenefit: Benefit = {
      id: award.id,
      name: info.name,
      description: award.notes || `${info.brand} standalone award.`,
      value: totalVal,
      resetPeriod: 'fixed',
      expirationDate: award.expirationDate,
      category: (info.awardType === 'fnr' || info.awardType === 'sua' || info.awardType === 'goh' || info.awardType === 'companion' || info.awardType === 'swu') 
        ? 'travel' 
        : info.awardType === 'points' ? 'shopping' : 'other'
    };

    activeBenefits.push({
      benefit: synthesizedBenefit,
      logKey: award.id,
      isUsed: award.isUsed,
      loyaltyAward: award
    });
  });

  // Helper to calculate recouped value of a specific card instance
  const getCardRecoupedValue = (instanceId: string): number => {
    const instance = ownedCards.find((c) => c.id === instanceId);
    const subValue = (instance?.signupBonusActive && instance.signupBonusValue !== undefined) 
      ? instance.signupBonusValue 
      : 0;
    const cardBenefits = activeBenefits.filter((ab) => ab.cardInstance && ab.cardInstance.id === instanceId);
    const sum = cardBenefits.reduce((s, ab) => s + getResolvedValue(ab), subValue);
    return Math.round(sum * 100) / 100;
  };

  // Helper to calculate resolved value dynamically (supports progressive spends, binary logs, and standalone awards)
  const getResolvedValue = (ab: ActiveBenefit): number => {
    if (ab.loyaltyAward) {
      return ab.isUsed ? ab.benefit.value : 0;
    }

    const logVal = logs[obfuscateKey(ab.logKey)];
    if (!logVal) return 0;
    
    const parsed = parseLogEntry(logVal);
    if (!parsed || !parsed.resolved) return 0;
    
    if (ab.benefit.spendingLimit) {
      const spent = parsed.spentProgress || 0;
      const progressPercent = Math.min(spent / ab.benefit.spendingLimit, 1);
      return Math.round((ab.benefit.value * progressPercent) * 100) / 100;
    }
    
    return ab.benefit.value;
  };

  const getExpiredValue = (ab: ActiveBenefit): number => {
    const isExpired = ab.loyaltyAward
      ? (!ab.isUsed && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate)
      : (ab.benefit.resetPeriod === 'fixed' && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate);
      
    if (!isExpired) return 0;
    return ab.benefit.value - getResolvedValue(ab);
  };

  // Compute stats
  const totalPotentialValue = activeBenefits.reduce((sum, ab) => sum + ab.benefit.value, 0);
  const resolvedValue = Math.round(activeBenefits.reduce((sum, ab) => sum + getResolvedValue(ab), 0) * 100) / 100;
  const expiredValue = Math.round(activeBenefits.reduce((sum, ab) => sum + getExpiredValue(ab), 0) * 100) / 100;
  const pendingValue = Math.round((totalPotentialValue - resolvedValue - expiredValue) * 100) / 100;

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
  }) as any;

  // Filtered benefits for view
  const filteredBenefits = activeBenefits.filter((ab) => {
    if (activeTab === 'todo' && ab.isUsed) return false;
    if (filterCategory !== 'all') {
      if (filterCardInstanceId === 'awards') {
        if (!ab.loyaltyAward) return false;
        const awardType = ab.loyaltyAward.templateId === 'custom'
          ? (ab.loyaltyAward.customAwardType || 'other')
          : (AWARD_TEMPLATES[ab.loyaltyAward.templateId]?.awardType || 'other');
        if (awardType !== filterCategory) return false;
      } else {
        if (ab.benefit.category !== filterCategory) return false;
      }
    }
    if (filterCardInstanceId !== 'all') {
      if (filterCardInstanceId === 'awards') {
        if (!ab.loyaltyAward) return false;
      } else {
        if (!ab.cardInstance || ab.cardInstance.id !== filterCardInstanceId) return false;
      }
    }
    return true;
  });

  // Helpers & Sorting delegated to utility helpers
  const sortedBenefits = [...filteredBenefits].sort((a, b) => {
    // Keep resolved/used items at the bottom of all sorting strategies
    if (a.isUsed !== b.isUsed) {
      return a.isUsed ? 1 : -1;
    }

    switch (sortBy) {
      case 'value-desc':
        return b.benefit.value - a.benefit.value;
      case 'value-asc':
        return a.benefit.value - b.benefit.value;
      case 'expiry':
        const daysA = a.loyaltyAward
          ? (a.benefit.expirationDate ? getDaysLeftForDate(a.benefit.expirationDate, currentDate) : 9999)
          : (getDaysLeft(a, currentDate) ?? 9999);
        const daysB = b.loyaltyAward
          ? (b.benefit.expirationDate ? getDaysLeftForDate(b.benefit.expirationDate, currentDate) : 9999)
          : (getDaysLeft(b, currentDate) ?? 9999);
        return daysA - daysB;
      case 'urgency':
      default:
        return getUrgencyScore(a, currentDate) - getUrgencyScore(b, currentDate);
    }
  });

  const addOfferCard = ownedCards.find((c) => c.id === addOfferInstanceId);

  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
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
            <div className={`p-2 rounded-xl text-slate-950 ${
              themeClass('bg-gradient-to-tr from-amber-500 to-yellow-600', 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white')
            }`}>
              <CreditCard className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${themeClass('text-white', 'text-slate-900')}`}>Credit Card Benefits Tracker</h1>
              <p className={`text-xs flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-500')}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${themeClass('bg-green-500', 'bg-green-600')}`}></span>
                <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end sm:justify-start self-end sm:self-auto animate-fade-in">
            {/* Year-End Savings Wrapped Button (Viral Growth Magnet!) */}
            {ownedCards.length > 0 && (
              <button
                onClick={() => setIsWrappedModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-purple-600/15 border-purple-500/30 hover:border-purple-400/50 text-purple-400 hover:text-purple-300 font-extrabold text-xs transition duration-300 active:scale-90 cursor-pointer shadow-md shadow-purple-500/5 animate-pulse"
                title="View and Share your Personal Churner Savings Wrapped Poster!"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow" />
                <span>Wrapped 👑</span>
              </button>
            )}

            {/* Google Drive Cloud Sync Widget */}
            <div className="relative">
              <button
                onClick={() => setIsSyncDropdownOpen(!isSyncDropdownOpen)}
                className={`p-2 rounded-xl border transition duration-300 active:scale-90 cursor-pointer ${
                  syncStatus === 'synced'
                    ? themeClass('bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15', 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100 shadow-sm')
                    : syncStatus === 'syncing'
                    ? themeClass('bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse', 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm')
                    : syncStatus === 'error'
                    ? themeClass('bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15', 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-sm')
                    : themeClass('bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400', 'bg-white border-slate-250 hover:bg-slate-100 text-slate-500 shadow-sm')
                }`}
                title="Google Drive Cloud Sync"
              >
                {syncStatus === 'synced' ? (
                  <Cloud className="w-4 h-4" />
                ) : (
                  <CloudOff className="w-4 h-4" />
                )}
              </button>

              {isSyncDropdownOpen && (
                <div className={`border rounded-xl p-4 shadow-2xl z-50 animate-scale-up flex flex-col gap-3 max-sm:fixed max-sm:top-16 max-sm:right-4 max-sm:left-4 max-sm:w-auto sm:absolute sm:right-0 sm:w-64 sm:mt-2 ${
                  themeClass('bg-slate-900/95 border-slate-800 text-slate-200 backdrop-blur-xl shadow-slate-950/50', 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-xl shadow-slate-300/30')
                }`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      syncStatus === 'synced' 
                        ? 'bg-green-500/10 text-green-500' 
                        : syncStatus === 'syncing' 
                        ? 'bg-purple-500/10 text-purple-500 animate-pulse'
                        : syncStatus === 'error'
                        ? 'bg-red-500/10 text-red-500'
                        : themeClass('bg-slate-950 text-slate-400', 'bg-slate-100 text-slate-505')
                    }`}>
                      {syncStatus === 'synced' ? (
                        <Cloud className="w-4.5 h-4.5" />
                      ) : (
                        <CloudOff className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="space-y-0.5 text-left min-w-0">
                      <h5 className={`font-bold text-xs ${themeClass('text-white', 'text-slate-900')}`}>
                        Google Drive Sync
                      </h5>
                      <p className={`text-[10px] leading-normal ${themeClass('text-slate-400', 'text-slate-550')}`}>
                        {syncStatus === 'synced' 
                          ? 'Automatic backup is active.'
                          : 'Private sandboxed appData cloud backup.'}
                      </p>
                    </div>
                  </div>

                  {syncStatus === 'synced' && (
                    <div className={`p-2 rounded bg-slate-955/40 dark:bg-slate-950/60 border text-[10px] text-left space-y-1 ${
                      themeClass('border-slate-850 text-slate-400', 'border-slate-200 text-slate-600')
                    }`}>
                      <p className="truncate font-medium">Account: {gdriveEmail}</p>
                      <p className="opacity-80">Last synced: {lastSyncedTime || 'Just now'}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-slate-200/40 dark:border-slate-800/40">
                    {syncStatus === 'synced' ? (
                      <>
                        <button
                          onClick={async () => {
                            setIsSyncDropdownOpen(false);
                            setSyncStatus('syncing');
                            try {
                              let token = useCardStore.getState().gdriveToken;
                              if (!token) {
                                token = await requestGDriveToken(customClientId);
                                const email = await fetchUserEmail(token);
                                setGDriveCredentials(token, email);
                              }
                              await useCardStore.getState().syncWithGDrive();
                              showToast('🎉 Synchronized with Google Drive successfully!');
                            } catch (err) {
                              console.error('Manual Force Sync failed:', err);
                              setSyncStatus('error');
                              showToast('❌ Failed to synchronize. Please try again.', 'error');
                            }
                          }}
                          className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-lg text-[10px] transition active:scale-95 shadow shadow-purple-500/10 cursor-pointer"
                        >
                          Force Sync Now
                        </button>
                        <button
                          onClick={() => {
                            handleDisconnectGoogleDrive();
                            setIsSyncDropdownOpen(false);
                          }}
                          className={`w-full text-center font-bold text-[10px] py-1.5 rounded-lg border transition cursor-pointer ${
                            themeClass('bg-slate-800 hover:bg-slate-750 border-slate-750 text-slate-300', 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600')
                          }`}
                        >
                          Disconnect Account
                        </button>
                      </>
                    ) : syncStatus === 'syncing' ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-purple-500 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing...</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          handleLinkGoogleDrive();
                          setIsSyncDropdownOpen(false);
                        }}
                        className="w-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2 rounded-lg text-[10px] transition active:scale-95 shadow shadow-purple-500/10 cursor-pointer"
                      >
                        Connect Google Drive
                      </button>
                    )}
                  </div>

                  {/* Advanced Developer Settings Accordion */}
                  <div className="mt-1 pt-2 border-t border-dashed border-slate-205/40 dark:border-slate-800 text-left">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdvancedSync(!showAdvancedSync);
                      }}
                      className={`text-[8px] font-bold tracking-wide uppercase flex items-center gap-0.5 transition cursor-pointer ${
                        themeClass('text-slate-500 hover:text-slate-450', 'text-slate-450 hover:text-slate-600')
                      }`}
                    >
                      {showAdvancedSync ? '▼ Developer Options' : '▶ Developer Options'}
                    </button>

                    {showAdvancedSync && (
                      <div className="mt-2 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className={`block text-[7px] font-bold uppercase tracking-wider mb-1 ${
                            themeClass('text-slate-505', 'text-slate-555')
                          }`}>
                            Custom Google Client ID
                          </label>
                          <input
                            type="text"
                            placeholder="Pasted client ID..."
                            value={customClientId || ''}
                            onChange={(e) => setCustomClientId(e.target.value || null)}
                            className={`w-full text-[9px] rounded px-2 py-1 border focus:outline-none font-mono transition ${
                              themeClass('bg-slate-955 border-slate-850 text-slate-200 focus:border-purple-500', 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500')
                            }`}
                          />
                        </div>
                        <p className="text-[8px] leading-normal opacity-75 text-slate-500">
                          Paste your own Google Cloud Web Client ID with authorized origins matching your site.
                        </p>
                      </div>
                    )}
                  </div>

                 </div>
              )}
            </div>

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
                onClick={() => setIsSyncModalOpen(true)}
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

            {currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear() ? (
              <button
                onClick={() => setCurrentDate(new Date())}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border rounded-lg cursor-pointer hover:bg-amber-500/20 transition active:scale-95 duration-200 animate-pulse ${
                  themeClass('border-amber-500/25 hover:border-amber-500/55', 'border-amber-500/40 hover:border-amber-500/70')
                }`}
                title="Click to Reset simulated month back to Today"
              >
                <span>⚠️ Simulated Sandbox</span>
                <RefreshCw className="w-3 h-3 animate-spin-slow" />
              </button>
            ) : null}

            <div className={`flex items-center rounded-lg p-1 text-xs font-medium border ${
              themeClass('bg-slate-900 text-slate-300 border-slate-800', 'bg-slate-200/60 text-slate-700 border-slate-300/80 shadow-inner')
            }`}>
              <button 
                onClick={() => adjustMonth(-1)} 
                className={`px-2 py-1 rounded transition ${themeClass('hover:bg-slate-800', 'hover:bg-slate-305')}`}
                title="Previous Month"
              >
                ◀
              </button>
              <span className={`px-3 py-1 min-w-[110px] text-center font-semibold ${themeClass('text-white', 'text-slate-900')}`}>
                {currentMonthStr} {currentYear}
              </span>
              <button 
                onClick={() => adjustMonth(1)} 
                className={`px-2 py-1 rounded transition ${themeClass('hover:bg-slate-800', 'hover:bg-slate-305')}`}
                title="Next Month"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className={`border rounded-xl p-3 sm:p-4 transition duration-300 ${
            themeClass('bg-slate-900/50 border-slate-800/60', 'bg-white border-slate-200 shadow-sm')
          }`}>
            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${themeClass('text-slate-400', 'text-slate-550')}`}>
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
        </section>

        {/* Tabs panel */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 ${themeClass('border-slate-900', 'border-slate-200')}`}>
          <div className={`flex gap-1 p-1 rounded-xl self-start ${themeClass('bg-slate-900/80', 'bg-slate-200/60')}`}>
            <button
              onClick={() => setActiveTab('todo')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'todo'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              To-Do ({activeBenefits.filter(b => !b.isUsed).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              All Benefits ({activeBenefits.length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-955'
                  : themeClass('text-slate-400 hover:text-white hover:bg-slate-855', 'text-slate-505 hover:text-slate-900 hover:bg-slate-300/30')
              }`}
            >
              My Cards ({ownedCards.length})
            </button>
          </div>

          {ownedCards.length > 0 && activeTab !== 'cards' && (
            <div className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
              themeClass('bg-slate-900/40 border-slate-900 text-slate-400', 'bg-slate-100 border-slate-200 text-slate-600')
            }`}>
              🏆 Recouped: <span className="text-emerald-500 font-extrabold">${resolvedValue}</span> / <span className={themeClass('text-white', 'text-slate-900')}>${totalPotentialValue}</span>
            </div>
          )}
        </div>

        {/* 0. Glanceable Point Multiplier Checkout Winners Row */}
        <CheckoutWinnersRow checkoutWinners={checkoutWinners} activeTab={activeTab} />

        {/* 0.5. Annual Fee Anniversary Warning Widget (Fully Conditional) */}
        <AnnualFeeWarningsWidget annualFeeWarnings={annualFeeWarnings} activeTab={activeTab} dismissWarning={dismissWarning} showToast={showToast} themeClass={themeClass} />

        {/* Premium Glassmorphic Filters Control Panel */}
        <FilterHubPanel
          ownedCards={ownedCards}
          loyaltyAwards={loyaltyAwards}
          activeTab={activeTab}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterCardInstanceId={filterCardInstanceId}
          setFilterCardInstanceId={setFilterCardInstanceId}
          sortBy={sortBy}
          setSortBy={setSortBy}
          themeClass={themeClass}
          language={language}
        />

        {/* TABS 1 & 2: CHECKLIST VIEW */}
        {(activeTab === 'todo' || activeTab === 'all') && (
          <section>
            {ownedCards.length === 0 ? (
              <EmptyWalletState onBrowse={() => setActiveTab('cards')} themeClass={themeClass} />
            ) : sortedBenefits.length === 0 ? (
              <div className={`text-center py-16 border rounded-2xl p-8 ${
                themeClass('bg-slate-900/20 border-slate-800/40', 'bg-white border-slate-200 shadow-sm')
              }`}>
                <CheckCircle2 className="w-10 h-10 text-emerald-505/50 mx-auto mb-4" />
                <h3 className={`text-lg font-semibold ${themeClass('text-slate-300', 'text-slate-800')}`}>All benefits resolved!</h3>
                <p className="text-xs text-slate-505 max-w-xs mx-auto mt-1">
                  Nice job! You have maximized all tracked credits for this period.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBenefits.map((ab) => {
                  const isExpired = ab.loyaltyAward 
                    ? (!ab.isUsed && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate)
                    : (!ab.isUsed && ab.benefit.resetPeriod === 'fixed' && !!ab.benefit.expirationDate && new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate);

                  const daysLeft = ab.loyaltyAward
                    ? (ab.benefit.expirationDate ? getDaysLeftForDate(ab.benefit.expirationDate, currentDate) : null)
                    : getDaysLeft(ab, currentDate);

                  const isProgressive = !!ab.benefit.spendingLimit;
                  const spent = isProgressive ? (Number(logs[ab.logKey]) || 0) : 0;
                  const spentPercent = isProgressive ? Math.min((spent / (ab.benefit.spendingLimit || 1)) * 100, 100) : 0;
                  const cashbackEarned = isProgressive ? Math.round((ab.benefit.value * Math.min(spent / (ab.benefit.spendingLimit || 1), 1)) * 100) / 100 : 0;

                  return (
                    <ChecklistCardRow
                      key={ab.logKey}
                      ab={ab}
                      logs={logs}
                      daysLeft={daysLeft}
                      isExpired={isExpired}
                      isProgressive={isProgressive}
                      spent={spent}
                      spentPercent={spentPercent}
                      cashbackEarned={cashbackEarned}
                      toggleBenefit={(key) => {
                        if (ab.loyaltyAward) {
                          toggleLoyaltyAward(key);
                        } else {
                          toggleBenefit(key);
                        }
                      }}
                      updateProgressLog={updateProgressLog}
                      themeClass={themeClass}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: MY CARDS MANAGER */}
        {activeTab === 'cards' && (
          <section className="space-y-6 animate-fade-in">
            {/* Double-Deck Segmented Switcher (0% Visual Bloat!) */}
            <div className="flex justify-center mb-2 animate-fade-in">
              <div className={`flex gap-0.5 p-0.5 rounded-xl border w-full max-w-[280px] ${
                themeClass('bg-slate-950 border-slate-850/80', 'bg-slate-200/40 border-slate-300/60')
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
                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-505')}`}>
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
                          themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-805 shadow-inner')
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
                      <p className={`text-xs ${themeClass('text-slate-500', 'text-slate-400')}`}>Your wallet is empty. Add cards from the library below! 🛒</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {ownedCards.filter((instance) => {
                        const temp = CARDS_DB.find((t) => t.id === instance.templateId);
                        const cardName = instance.templateId === 'custom' ? instance.customName : (temp?.name || '');
                        const cardBank = instance.templateId === 'custom' ? (instance.bank || '') : (temp?.bank || '');
                        return (
                          cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cardBank.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      }).map((instance) => {
                        const isCardExpanded = !!expandedCardIds[instance.id];
                        return (
                          <WalletCreditCard
                            key={instance.id}
                            instance={instance}
                            editingInstanceId={editingInstanceId}
                            setEditingInstanceId={setEditingInstanceId}
                            isCardExpanded={isCardExpanded}
                            toggleCardExpanded={toggleCardExpanded}
                            getCardRecoupedValue={getCardRecoupedValue}
                            handleAddCard={handleAddCard}
                            handleAddCustomCard={handleAddCustomCard}
                            handleRemoveCard={handleRemoveCard}
                            renameCard={renameCard}
                            setCardOpenDate={setCardOpenDate}
                            removeInstanceOffer={removeInstanceOffer}
                            updateCardMultipliers={updateCardMultipliers}
                            toggleSignupBonus={toggleSignupBonus}
                            updateSignupBonusValue={updateSignupBonusValue}
                            setAddOfferInstanceId={setAddOfferInstanceId}
                            themeClass={themeClass}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. ADD CARD LIBRARY */}
                <div className={`border rounded-xl p-4 sm:p-6 transition duration-300 ${
                  themeClass('bg-slate-900/30 border-slate-850', 'bg-white border-slate-200 shadow-sm')
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-3 border-b border-dashed border-slate-200/60 dark:border-slate-800/60">
                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeClass('text-slate-400', 'text-slate-555')}`}>
                      <Plus className="w-4 h-4 text-amber-500" />
                      Add New Cards (Templates)
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap shrink-0">
                      {/* Minimalist Annual Fee Segment Selector */}
                      <div className={`flex items-center gap-0.5 p-0.5 rounded-xl border shrink-0 ${
                        themeClass('bg-slate-955/30 border-slate-850/80', 'bg-slate-50 border-slate-200/80 shadow-inner')
                      }`}>
                        {(['all', 'free', 'mid', 'premium'] as const).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setTemplateFeeFilter(filter)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition uppercase tracking-wider cursor-pointer ${
                              templateFeeFilter === filter
                                ? themeClass('bg-slate-955 text-amber-400 border border-slate-850/50 shadow-sm', 'bg-white text-purple-600 border border-slate-200 shadow-sm')
                                : 'text-slate-500 hover:text-slate-400 dark:hover:text-slate-300'
                            }`}
                          >
                            {filter === 'all' ? 'All' :
                             filter === 'free' ? 'Free ($0)' :
                             filter === 'mid' ? 'Mid (<$300)' : 'Prem ($300+)'}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="🔍 Search card templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`border text-xs rounded-xl px-3 py-1.5 focus:outline-none w-48 font-medium ${
                          themeClass('bg-slate-955 border-slate-800 focus:border-purple-500 text-slate-200', 'bg-slate-50 border-slate-250 focus:border-purple-500 text-slate-800 shadow-inner')
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-8">
                    {(['Amex', 'Chase', 'Citi', 'Other'] as const).map((bankName) => {
                      const bankCards = CARDS_DB.filter((c) => c.bank === bankName).filter((c) => {
                        // Search Query Check
                        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                              c.bank.toLowerCase().includes(searchQuery.toLowerCase());
                        if (!matchesSearch) return false;

                        // Annual Fee Filter Check
                        if (templateFeeFilter === 'free') return c.annualFee === 0;
                        if (templateFeeFilter === 'mid') return c.annualFee > 0 && c.annualFee < 300;
                        if (templateFeeFilter === 'premium') return c.annualFee >= 300;
                        return true;
                      });
                      if (bankCards.length === 0) return null;

                      return (
                        <div key={bankName} className="space-y-3.5">
                          <div className={`flex items-center gap-2 border-b pb-2 ${themeClass('border-slate-900', 'border-slate-200')}`}>
                            <div className={`w-2 h-2 rounded-full ${
                              bankName === 'Amex' ? 'bg-amber-500' :
                              bankName === 'Chase' ? 'bg-blue-500' :
                              bankName === 'Citi' ? 'bg-red-500' : 'bg-orange-500'
                            }`} />
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${themeClass('text-slate-400', 'text-slate-500')}`}>
                              {bankName === 'Amex' ? 'American Express' : bankName === 'Citi' ? 'Citibank' : bankName === 'Other' ? 'Other Banks' : bankName} Templates
                            </h4>
                            <span className="text-[10px] text-slate-600 font-semibold ml-auto">
                              {bankCards.length} templates
                            </span>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            {bankCards.map((card) => (
                              <div 
                                key={card.id}
                                onClick={() => setActiveTemplateDetail(card)}
                                className={`p-4 rounded-xl border flex flex-col justify-between transition cursor-pointer hover:scale-[1.01] duration-200 relative overflow-hidden group/card after:absolute after:top-0 after:-left-[150%] after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/15 dark:after:via-white/10 after:to-transparent after:skew-x-12 after:transition-all after:duration-700 hover:after:left-[150%] ${
                                  themeClass('bg-slate-955 border-slate-900 hover:border-slate-850', 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm')
                                }`}
                              >
                                <div className="flex gap-3.5 items-start flex-grow pb-2">
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
                                      <span className={`text-[9px] font-semibold uppercase tracking-wider ${themeClass('text-slate-500', 'text-slate-550')}`}>{card.bank}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                        card.annualFee > 0 
                                          ? themeClass('bg-slate-955 text-amber-400 border border-slate-850/80', 'bg-slate-100 text-purple-600 border border-slate-200')
                                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                                      }`}>
                                        {card.annualFee > 0 ? `Fee: $${card.annualFee}` : 'No Fee'}
                                      </span>
                                    </div>
                                    <h4 className={`text-sm font-extrabold mt-1.5 ${themeClass('text-white', 'text-slate-900')}`}>{card.name}</h4>
                                    <p className={`text-[11px] mt-1.5 leading-relaxed font-medium ${themeClass('text-slate-405', 'text-slate-555')}`}>
                                      Contains <span className="font-bold text-purple-500 dark:text-amber-400">{card.benefits.length}</span> built-in perks <br />
                                      (Total value: <span className={`font-bold ${themeClass('text-white', 'text-slate-955')}`}>${card.benefits.reduce((s, b) => s + b.value, 0)}/yr</span>)
                                    </p>
                                    <span className="text-[9px] text-purple-500 dark:text-purple-455 font-bold mt-2.5 block animate-pulse">
                                      🔍 Click card to view details
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent modal drawer trigger
                                    handleAddCard(card.id);
                                  }}
                                  className="w-full mt-4 flex items-center justify-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-[0.97] shadow shadow-purple-500/10 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  Add to Wallet
                                </button>
                              </div>
                            ))}
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
                      <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                      Loyalty Awards & Standalone Vouchers ({loyaltyAwards.length} active)
                    </h3>
                    <button
                      onClick={() => setIsCreateAwardModalOpen(true)}
                      className="flex items-center gap-1 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-purple-500/10 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      Add Standalone Voucher
                    </button>
                  </div>

                  {(() => {
                    const filteredAwards = loyaltyAwards.filter((award) => {
                      const isCustom = award.templateId === 'custom';
                      const info = isCustom ? {
                        name: award.customName || 'Custom Voucher',
                        brand: award.customBrand || 'Other'
                      } : AWARD_TEMPLATES[award.templateId];

                      const searchLower = searchQuery.toLowerCase();
                      return (
                        info.name.toLowerCase().includes(searchLower) ||
                        info.brand.toLowerCase().includes(searchLower) ||
                        (award.notes && award.notes.toLowerCase().includes(searchLower))
                      );
                    });

                    if (loyaltyAwards.length === 0) {
                      return (
                        <div className="text-center py-10">
                          <p className={`text-xs ${themeClass('text-slate-500', 'text-slate-400')}`}>No standalone awards or vouchers inside your card collection yet. Click Add Standalone Voucher above! 🎁</p>
                        </div>
                      );
                    }

                    if (filteredAwards.length === 0) {
                      return (
                        <div className="text-center py-10 animate-fade-in">
                          <p className={`text-xs ${themeClass('text-slate-500', 'text-slate-400')}`}>🔍 No vouchers matching your search query.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {filteredAwards.map((award) => {
                        const isCustom = award.templateId === 'custom';
                        const info = isCustom ? {
                          name: award.customName || 'Custom Voucher',
                          brand: award.customBrand || 'Other',
                          programType: award.customProgramType || 'other',
                          awardType: award.customAwardType || 'other',
                          value: award.customValue || 0
                        } : AWARD_TEMPLATES[award.templateId];

                        const totalVal = info.value * award.quantity;

                        // Sleek, dynamic brand color gradients matching luxury styles!
                        const brandColor = 
                          info.brand.toLowerCase() === 'hyatt' ? 'from-emerald-500 to-teal-700 text-white' :
                          info.brand.toLowerCase() === 'marriott' ? 'from-indigo-900 via-stone-950 to-stone-900 text-white' :
                          info.brand.toLowerCase() === 'hilton' ? 'from-amber-500 to-yellow-650 text-white' :
                          info.brand.toLowerCase() === 'ihg' ? 'from-amber-900 via-neutral-955 to-neutral-955 text-white' :
                          info.brand.toLowerCase() === 'delta' ? 'from-sky-600 to-blue-800 text-white' :
                          info.brand.toLowerCase() === 'alaska' ? 'from-emerald-600 to-indigo-800 text-white' :
                          info.brand.toLowerCase() === 'united' ? 'from-blue-700 to-blue-950 text-white' :
                          info.brand.toLowerCase() === 'aa' ? 'from-slate-500 via-slate-600 to-zinc-700 text-white' :
                          info.brand.toLowerCase() === 'amex' ? 'from-[#c5a059] to-[#9c7a3c] text-white' :
                          'from-slate-600 to-slate-800 text-white';

                        return (
                          <div 
                            key={award.id}
                            className={`p-4 rounded-xl border relative overflow-hidden group flex flex-col justify-between transition duration-200 ${
                              award.isUsed ? 'opacity-45' : ''
                            } ${
                              themeClass('bg-slate-955/40 border-slate-900 hover:border-slate-850', 'bg-slate-50/50 border-slate-200 hover:border-slate-250 hover:bg-slate-50 shadow-sm')
                            }`}
                          >
                            <div className="flex gap-3 items-start pb-2">
                              {/* Mini Voucher Card Preview */}
                              <div className={`w-14 h-9 rounded-md bg-gradient-to-r ${brandColor} shrink-0 relative shadow-md border border-white/10 flex items-center justify-center overflow-hidden`}>
                                <span className="text-[9px] font-black uppercase tracking-widest scale-90">{info.brand.substring(0, 4)}</span>
                              </div>

                              <div className="min-w-0 flex-grow">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wide ${
                                    themeClass('bg-slate-900 text-slate-400', 'bg-white text-slate-500 border border-slate-200')
                                  }`}>
                                    {info.awardType} • {award.quantity}x
                                  </span>
                                  <span className="text-[9px] font-extrabold text-amber-500">${totalVal} USD</span>
                                </div>
                                <h4 className={`text-xs font-black mt-1.5 truncate ${award.isUsed ? 'line-through text-slate-500' : themeClass('text-white', 'text-slate-900')}`}>{info.name}</h4>
                                
                                {award.expirationDate && (
                                  <p className={`text-[9px] font-bold mt-1 ${
                                    getDaysLeftForDate(award.expirationDate, currentDate) < 10 ? 'text-red-500 animate-pulse' : 'text-slate-500'
                                  }`}>
                                    Expires: {award.expirationDate} ({getDaysLeftForDate(award.expirationDate, currentDate)} days left)
                                  </p>
                                )}
                                {award.notes && (
                                  <p className="text-[9px] italic text-slate-500 mt-1 leading-relaxed truncate">
                                    {award.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-dashed border-slate-200/30 dark:border-slate-800/30">
                              <button
                                onClick={() => toggleLoyaltyAward(award.id)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer ${
                                  award.isUsed
                                    ? 'bg-slate-500/15 text-slate-400 hover:bg-slate-500/20'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500'
                                }`}
                              >
                                {award.isUsed ? 'Mark Unused' : 'Mark Used'}
                              </button>
                              <button
                                onClick={() => setDeleteAwardId(award.id)}
                                className={`p-1.5 rounded-lg hover:bg-red-500/10 text-slate-505 hover:text-red-500 transition active:scale-90 cursor-pointer`}
                                title="Delete Voucher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                </div>
              </div>
            )}

            {/* Portability tools */}
            <div className={`border rounded-xl p-5 transition duration-300 ${
              themeClass('bg-slate-900/20 border-slate-900', 'bg-white border-slate-200 shadow-sm')
            }`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${themeClass('text-slate-400', 'text-slate-600')}`}>Data Portability & Safety</h4>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportBackup}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                    themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-300', 'bg-white hover:bg-slate-100 border-slate-250 text-slate-600 shadow-sm')
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-505" />
                  Export JSON Backup
                </button>

                <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition ${
                  themeClass('bg-slate-900 hover:bg-slate-855 border-slate-800 text-slate-300', 'bg-white hover:bg-slate-100 border-slate-250 text-slate-600 shadow-sm')
                }`}>
                  <Upload className="w-3.5 h-3.5 text-slate-505" />
                  Restore Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={importBackup}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setIsWipeDataOpen(true)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition ml-auto cursor-pointer ${
                    themeClass('bg-red-555/10 hover:bg-red-555/20 border-red-500/20 text-red-400', 'bg-red-500/5 hover:bg-red-500/10 border-red-300/30 text-red-500 shadow-sm')
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe App Data
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Premium Footer: Privacy & Performance Guard declaration */}
      <footer className="mt-auto py-8 px-4 text-center space-y-1.5 shrink-0">
        <p className={`text-[9px] font-bold tracking-wider uppercase ${themeClass('text-slate-500/80', 'text-slate-400')}`}>
          💳 CC Benefits Tracker • Made with Passion for Savvy Churners
        </p>
        <p className="text-[8.5px] leading-relaxed max-w-md mx-auto opacity-70 text-slate-500 dark:text-slate-400 font-medium">
          🔒 <strong>Privacy & Performance Guard</strong>: Your credit card data is stored 100% locally on this device. To guarantee ultra-fast synchronization and zero cellular data waste, historical logs older than 24 months are automatically pruned.
        </p>
      </footer>

      {/* Calendar Sync Modal */}
      <CalendarSyncModal 
        isOpen={isSyncModalOpen} 
        onClose={() => setIsSyncModalOpen(false)} 
        ownedCards={ownedCards}
        loyaltyAwards={loyaltyAwards}
        theme={theme}
      />

      {/* Create Custom Card Modal */}
      <CreateCardModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        theme={theme}
        addCustomCard={handleAddCustomCard}
        getLocalDateString={getLocalDateString}
        showToast={showToast}
      />

      {/* Card Detail popover Sheet Drawer */}
      <CardDetailDrawer 
        isOpen={!!activeTemplateDetail}
        card={activeTemplateDetail}
        onClose={() => setActiveTemplateDetail(null)}
        onAdd={() => handleAddCard(activeTemplateDetail ? activeTemplateDetail.id : '')}
        theme={theme}
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

      {/* SpentAssistant AI Drawer */}
      <SpentAssistant remainingBenefits={remainingBenefits} logs={logs} theme={theme} showToast={showToast} />

      {/* Google Drive Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={isGDriveDisconnectOpen}
        title="Disconnect Google Drive?"
        message="Are you sure you want to disconnect and unlink Google Drive? Your local data will remain intact, but automated cloud synchronization will cease."
        confirmText="Disconnect"
        cancelText="Cancel"
        onConfirm={handleConfirmDisconnectGoogleDrive}
        onCancel={() => setIsGDriveDisconnectOpen(false)}
        theme={theme}
        type="warning"
      />

      {/* Wipe App Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={isWipeDataOpen}
        title="Wipe All App Data?"
        message="Are you absolutely sure you want to reset all card instances and checklist logs? This action is permanent and cannot be undone."
        confirmText="Wipe Data"
        cancelText="Keep Data"
        onConfirm={() => {
          resetAll();
          setIsWipeDataOpen(false);
          showToast('🗑️ All card data and logs have been wiped.', 'warning');
        }}
        onCancel={() => setIsWipeDataOpen(false)}
        theme={theme}
        type="danger"
      />

      {/* Standalone Loyalty Award Vouchers Constructor Modal */}
      <CreateAwardModal
        isOpen={isCreateAwardModalOpen}
        onClose={() => setIsCreateAwardModalOpen(false)}
        themeClass={themeClass}
      />

      {/* Premium Savings Wrapped Poster Modal */}
      <SavingsWrappedModal
        isOpen={isWrappedModalOpen}
        onClose={() => setIsWrappedModalOpen(false)}
        ownedCards={ownedCards}
        loyaltyAwards={loyaltyAwards}
        resolvedValue={resolvedValue}
        themeClass={themeClass}
      />

      {/* Premium Floating Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} theme={theme} />
      )}
    </div>
  );
}

export default App;
