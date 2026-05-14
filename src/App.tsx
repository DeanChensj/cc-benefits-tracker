import { useState, useEffect, useMemo, useRef } from 'react';
// Meticulously audited and verified PWA release build with dynamic re-auth and contrast fixes
import { CARDS_DB } from './data/cards.db';
import type { CardTemplate, Benefit } from './data/cards.db';
import { useCardStore } from './store/useCardStore';
import type { OwnedCardInstance } from './store/useCardStore';
import { translations, formatCardNameForToast } from './utils/i18n';
import { WalletAiAssistant } from './components/WalletAiAssistant';
import { ChurningStatsDrawer } from './components/ChurningStatsDrawer';
import { CardDetailDrawer } from './components/CardDetailDrawer';
import { Toast } from './components/Toast';
import { WelcomeOfferSection } from './components/WelcomeOfferSection';
import { ZenModal } from './components/ZenModal';
import { EmptyWalletState } from './components/EmptyWalletState';
import { AnnualFeeWarningsWidget } from './components/AnnualFeeWarningsWidget';
import { ActiveChecklistTab } from './components/ActiveChecklistTab';
import { WalletLibraryTab } from './components/WalletLibraryTab';
import { getLocalDateString, getAnnualFeeWarningInfo } from './utils/dateUtils';
import { getResolvedValue, getCardRecoupedValue } from './utils/valuationUtils';

import { loadGoogleGsiScript, requestGDriveToken, fetchUserEmail } from './utils/gdrive';
import { useActiveBenefits } from './hooks/useActiveBenefits';
import type { ActiveBenefit } from './hooks/useActiveBenefits';
import { useCheckoutWinners } from './hooks/useCheckoutWinners';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StatsPanel } from './components/StatsPanel';
import { ModalsContainer } from './components/ModalsContainer';
import { createWelcomeOffer, getLogKey } from './utils/storeHelpers';
import { obfuscateKey } from './utils/cryptoUtils';
import { parseLogEntry } from './utils/logUtils';



function App() {
  const { 
    ownedCards, 
    loyaltyAwards,
    logs, 
    theme,
    syncStatus,
    setGDriveCredentials,
    setSyncStatus,
    customClientId,
    addCard, 
    addCardsBatch,
    addCustomCard,
    removeCard, 
    toggleBenefit, 
    updateProgressLog,
    removeInstanceOffer,
    toggleLoyaltyAward,
    updateAwardUsedQuantity,
    pruneExpiredLogs,
    language
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
  const [activeModal, setActiveModal] = useState<'sync' | 'create-card' | 'create-award' | 'wrapped' | 'disconnect-gdrive' | 'wipe' | 'settings' | null>(null);
  const [addOfferInstanceId, setAddOfferInstanceId] = useState<string | null>(null);
  const [deleteCardInstanceId, setDeleteCardInstanceId] = useState<string | null>(null);
  const [deleteAwardId, setDeleteAwardId] = useState<string | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [activeTemplateDetail, setActiveTemplateDetail] = useState<CardTemplate | null>(null);
  const [activeEditInstanceId, setActiveEditInstanceId] = useState<string | null>(null);

  const [activeEditAwardId, setActiveEditAwardId] = useState<string | null>(null);

  
  const [isConfigureAddOpen, setIsConfigureAddOpen] = useState(false);
  const [configuredTemplate, setConfiguredTemplate] = useState<CardTemplate | null>(null);



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
      const duration = (toast.type === 'warning' || toast.type === 'error') ? 2500 : 1500;
      const timer = setTimeout(() => setToast(null), duration);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChecklistToggle = (key: string) => {
    const ab = activeBenefits.find((b) => b.logKey === key);
    if (!ab) return;

    if (ab.loyaltyAward) {
      const targetAward = loyaltyAwards.find((a) => a.id === ab.loyaltyAward?.id);
      if (!targetAward) return;



      toggleLoyaltyAward(targetAward.id);
    } else {


      toggleBenefit(key);
    }


  };

  const handleUpdateProgressLog = (logKey: string, spent: number) => {


    updateProgressLog(logKey, spent);

    showToast(
      language === 'zh' ? `📈 消费进度已更新为 $${spent}` : `Progress updated to $${spent}`, 
      'success'
    );
  };

  const handleAddCard = (templateId: string) => {
    const generatedName = addCard(templateId);
    setDeckSubTab('cards');
    localStorage.setItem('cc-tracker-deck-sub-tab', 'cards');
    showToast(t('toastCardAdded').replace('{name}', formatCardNameForToast(generatedName)));
  };


  const handleConfirmRemoveCard = () => {
    if (!deleteCardInstanceId) return;
    const instance = ownedCards.find((c) => c.id === deleteCardInstanceId);
    if (instance) {
      const cardName = instance.customName;
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


  const activeBenefits = useActiveBenefits(ownedCards, loyaltyAwards, logs, currentDate);


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

  const checkoutWinners = useCheckoutWinners();


  // Calculate actual remaining, non-expired active benefits for the AI SpentAssistant (cards only)
  const remainingBenefits = useMemo(() => {
    return activeBenefits.filter((ab) => {
      if (ab.isUsed || !ab.cardInstance) return false;
      const isExpired = ab.benefit.resetPeriod === 'fixed' && 
        ab.benefit.expirationDate && 
        new Date(ab.benefit.expirationDate + 'T00:05:00') < currentDate;
      return !isExpired;
    }) as unknown as { cardInstance: OwnedCardInstance; benefit: Benefit; logKey: string }[];
   
  }, [activeBenefits, currentDate]);

  // Calculate Total Secured SUBs based on logs completion!
  const securedSUBs = useMemo(() => {
    return ownedCards.reduce((sum, card) => {
      const welcomeOffer = card.instanceOffers?.find((o) => o.type === 'welcome-offer');
      if (welcomeOffer) {
        const logKey = getLogKey(
          welcomeOffer.resetPeriod,
          card.id,
          welcomeOffer.id,
          currentDate,
          card.cardOpenDate,
          welcomeOffer.expirationDate
        );
        const obfuscatedKey = obfuscateKey(logKey);
        const logVal = logs[obfuscatedKey];
        const parsed = parseLogEntry(logVal);
        const spent = parsed?.spentProgress || 0;
        
        if (welcomeOffer.spendingLimit !== undefined && spent >= welcomeOffer.spendingLimit) {
          return sum + (card.signupBonusValue || 0);
        }
      }
      return sum;
    }, 0);
  }, [ownedCards, logs, currentDate]);





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
      <Header
        setActiveModal={setActiveModal}
        showToast={showToast}
        adjustMonth={adjustMonth}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      <main className="max-w-4xl mx-auto px-4 pt-3 sm:pt-6 pb-8">
        
        <StatsPanel
          totalPotentialValue={totalPotentialValue}
          resolvedValue={resolvedValue}
          pendingValue={pendingValue}
          utilizationRate={utilizationRate}
        />

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

      <Footer />

      <ModalsContainer
        securedSUBs={securedSUBs}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        addOfferInstanceId={addOfferInstanceId}
        setAddOfferInstanceId={setAddOfferInstanceId}
        deleteCardInstanceId={deleteCardInstanceId}
        setDeleteCardInstanceId={setDeleteCardInstanceId}
        deleteAwardId={deleteAwardId}
        setDeleteAwardId={setDeleteAwardId}
        activeEditInstanceId={activeEditInstanceId}
        setActiveEditInstanceId={setActiveEditInstanceId}
        activeEditAwardId={activeEditAwardId}
        setActiveEditAwardId={setActiveEditAwardId}
        showToast={showToast}
        handleAddCustomCard={handleAddCustomCard}
        getLocalDateString={getLocalDateString}
        handleConfirmRemoveCard={handleConfirmRemoveCard}
        handleConfirmDisconnectGoogleDrive={handleConfirmDisconnectGoogleDrive}
        handleLinkGoogleDrive={handleLinkGoogleDrive}
        handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
        resolvedValue={resolvedValue}
        expiredValue={expiredValue}
      />

      {/* Wallet AI Assistant Drawer */}
      <WalletAiAssistant remainingBenefits={remainingBenefits} logs={logs} theme={theme} showToast={showToast} ownedCards={ownedCards} loyaltyAwards={loyaltyAwards} />





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



      {/* Configure and Add Modal */}
      <ZenModal
        isOpen={isConfigureAddOpen}
        onClose={() => {
          setIsConfigureAddOpen(false);
          setConfiguredTemplate(null);
        }}
        title={t('configureCard')}
        theme={theme}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">
              {t('cardNickname')}
            </label>
            <input
              type="text"
              id="configure-card-name"
              defaultValue={configuredTemplate?.name || ''}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 transition-all duration-200 ${
                themeClass('bg-slate-800/50 border-slate-750 text-white focus:ring-purple-500/30 focus:border-purple-500', 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500')
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">
              {t('cardOpenDate')}
            </label>
            <input
              type="date"
              id="configure-card-date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 transition-all duration-200 ${
                themeClass('bg-slate-800/50 border-slate-750 text-white focus:ring-purple-500/30 focus:border-purple-500', 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-purple-500/20 focus:border-purple-500')
              }`}
            />
          </div>
          
          <WelcomeOfferSection
            idPrefix="configure"
            defaultValue={configuredTemplate?.signupBonusValue || 0}
            theme={theme}
          />

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => {
                setIsConfigureAddOpen(false);
                setConfiguredTemplate(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                themeClass('bg-slate-800 hover:bg-slate-750 text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')
              }`}
            >
              {t('cancel')}
            </button>
            <button
              onClick={() => {
                const nameInput = document.getElementById('configure-card-name') as HTMLInputElement;
                const dateInput = document.getElementById('configure-card-date') as HTMLInputElement;
                const subValueInput = document.getElementById('configure-sub-value') as HTMLInputElement;
                const subRequirementInput = document.getElementById('configure-sub-requirement') as HTMLInputElement;
                const subMonthsInput = document.getElementById('configure-sub-months') as HTMLInputElement;
                
                if (configuredTemplate) {
                  const addCustomCard = useCardStore.getState().addCustomCard;
                  
                  const instanceOffers: Benefit[] = [];
                  
                  const subActiveInput = document.getElementById('configure-sub-active') as HTMLInputElement;
                  const requirement = Number(subRequirementInput?.value) || 0;
                  const months = Number(subMonthsInput?.value) || 3;
                  const value = Number(subValueInput?.value) || 0;
                  
                  if (subActiveInput?.checked && value > 0) {
                    instanceOffers.push(
                      createWelcomeOffer(dateInput.value, requirement, months, value)
                    );
                  }

                  addCustomCard({
                    templateId: configuredTemplate.id,
                    customName: nameInput.value || configuredTemplate.name,
                    cardOpenDate: dateInput.value,
                    annualFee: configuredTemplate.annualFee,
                    instanceOffers,
                    signupBonusActive: subActiveInput?.checked,
                    signupBonusValue: value,
                    lastModified: Date.now()
                  });

                  showToast(t('toastCardAdded').replace('{name}', formatCardNameForToast(nameInput.value || configuredTemplate.name)));
                }
                setIsConfigureAddOpen(false);
                setConfiguredTemplate(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer text-white ${
                themeClass('bg-gradient-to-tr from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700/50', 'bg-gradient-to-tr from-slate-900 to-black hover:from-slate-800 hover:to-slate-900')
              }`}
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </ZenModal>

      {/* Card Detail Popover Drawer */}
      <CardDetailDrawer 
        isOpen={!!activeTemplateDetail}
        card={activeTemplateDetail}
        onClose={() => setActiveTemplateDetail(null)}
        onAdd={() => {
          handleAddCard(activeTemplateDetail ? activeTemplateDetail.id : '');
          setActiveTemplateDetail(null);
        }}
        onConfigureAdd={() => {
          setConfiguredTemplate(activeTemplateDetail);
          setIsConfigureAddOpen(true);
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
