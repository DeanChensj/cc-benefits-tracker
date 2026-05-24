import { useState, useEffect, useRef } from 'react';
import { useCardStore } from '../store/useCardStore';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { CardTemplate } from '../data/cards.db';
import { translations, formatCardNameForToast } from '../utils/i18n';
import { requestGDriveToken, fetchUserEmail } from '../utils/gdrive';
import type { ActiveBenefit } from '../utils/dateUtils';

export function useAppHandlers(currentDate: Date, setCurrentDate: (date: Date) => void, activeBenefits: ActiveBenefit[]) {
  const ownedCards = useCardStore((s) => s.ownedCards);
  const loyaltyAwards = useCardStore((s) => s.loyaltyAwards);
  const syncStatus = useCardStore((s) => s.syncStatus);
  const language = useCardStore((s) => s.language);
  const customClientId = useCardStore((s) => s.customClientId);

  const addCard = useCardStore((s) => s.addCard);
  const addCustomCard = useCardStore((s) => s.addCustomCard);
  const removeCard = useCardStore((s) => s.removeCard);
  const toggleBenefit = useCardStore((s) => s.toggleBenefit);
  const updateProgressLog = useCardStore((s) => s.updateProgressLog);
  const toggleLoyaltyAward = useCardStore((s) => s.toggleLoyaltyAward);
  const setGDriveCredentials = useCardStore((s) => s.setGDriveCredentials);
  const setSyncStatus = useCardStore((s) => s.setSyncStatus);

  const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

  const lastSyncTimeRef = useRef<number>(0);

  const [activeTab, setActiveTab] = useState<'todo' | 'cards'>(() => {
    return (localStorage.getItem('cc-tracker-active-tab') as 'todo' | 'cards') || 'todo';
  });
  const [deckSubTab, setDeckSubTab] = useState<'cards' | 'awards' | 'templates'>(() => {
    return (localStorage.getItem('cc-tracker-deck-sub-tab') as 'cards' | 'awards' | 'templates') || 'cards';
  });
  const [activeModal, setActiveModal] = useState<'sync' | 'create-card' | 'create-award' | 'wrapped' | 'disconnect-gdrive' | 'wipe' | 'settings' | 'sync-conflict' | null>(null);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const duration = (toast.type === 'warning' || toast.type === 'error') ? 2500 : 1500;
      const timer = setTimeout(() => setToast(null), duration);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (syncStatus === 'conflict') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveModal('sync-conflict');
    }
  }, [syncStatus]);

  const dismissWarning = (cardId: string) => {
    setDismissedWarningCardIds((prev) => ({
      ...prev,
      [cardId]: true
    }));
  };

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

  useEffect(() => {
    localStorage.setItem('cc-tracker-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleFocus = () => {
      const state = useCardStore.getState();
      if (state.gdriveToken && state.syncStatus === 'synced') {
        const now = Date.now();
        if (now - lastSyncTimeRef.current < 30000) return;
        lastSyncTimeRef.current = now;

        console.log('🔄 Auto-Refocus Sync: Tab focused. Triggering background sync merge.');
        state.syncWithGDrive().catch((err) => console.error('Auto-Refocus Sync failed:', err));
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [syncStatus]);

  const handleLinkGoogleDrive = async () => {
    setSyncStatus('syncing');
    try {
      const token = await requestGDriveToken(customClientId);
      const email = await fetchUserEmail(token);
      setGDriveCredentials(token, email);
      
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

  const adjustMonth = (amount: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + amount);
    setCurrentDate(nextDate);
    
    const newMonthName = nextDate.toLocaleString('default', { month: 'long' });
    const newYear = nextDate.getFullYear();
    showToast(t('toastSandboxSet').replace('{year}', String(newYear)).replace('{month}', newMonthName), 'info');
  };

  return {
    activeTab, setActiveTab,
    deckSubTab, setDeckSubTab,
    activeModal, setActiveModal,
    addOfferInstanceId, setAddOfferInstanceId,
    deleteCardInstanceId, setDeleteCardInstanceId,
    deleteAwardId, setDeleteAwardId,
    selectedTemplates, setSelectedTemplates,
    activeTemplateDetail, setActiveTemplateDetail,
    activeEditInstanceId, setActiveEditInstanceId,
    activeEditAwardId, setActiveEditAwardId,
    isConfigureAddOpen, setIsConfigureAddOpen,
    configuredTemplate, setConfiguredTemplate,
    dismissedWarningCardIds, dismissWarning,
    isChurningDrawerOpen, setIsChurningDrawerOpen,
    toast, showToast,
    handleChecklistToggle,
    handleUpdateProgressLog,
    handleAddCard,
    handleConfirmRemoveCard,
    handleAddCustomCard,
    handleLinkGoogleDrive,
    handleDisconnectGoogleDrive,
    handleConfirmDisconnectGoogleDrive,
    adjustMonth
  };
}
