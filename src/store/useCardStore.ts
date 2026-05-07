import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS_DB } from '../data/cards.db';
import type { Benefit } from '../data/cards.db';
import { findSyncFile, uploadSyncFile, downloadSyncFile } from '../utils/gdrive';

export interface OwnedCardInstance {
  id: string; // Unique instance ID (e.g. inst_171500000)
  templateId: string; // References the static CARDS_DB card id, or 'custom'
  customName: string; // User's label (e.g. "Amex Gold - Player 2")
  cardOpenDate: string; // Precise card opened date 'YYYY-MM-DD'
  bank?: string; // Custom bank name for custom cards
  color?: string; // Custom gradient classes for custom cards
  customBenefits?: Benefit[]; // Custom benefits for custom cards
  annualFee?: number; // Annual fee of the card instance
}

export interface CardStore {
  ownedCards: OwnedCardInstance[];
  logs: Record<string, boolean | number>; // logKey -> boolean (resolved) or number (spent progress value)
  theme: 'dark' | 'light'; // App theme selection
  language: 'zh' | 'en'; // App language selection
  
  // Google Drive Sync States
  gdriveToken: string | null; // Temporary in-memory OAuth access token
  gdriveEmail: string | null; // Connected google account email
  syncStatus: 'disconnected' | 'syncing' | 'synced' | 'error';
  lastSyncedTime: string | null;
  customClientId: string | null; // Custom Google Client ID (persisted)

  // Actions
  addCard: (templateId: string) => void;
  addCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  removeCard: (instanceId: string) => void;
  renameCard: (instanceId: string, customName: string) => void;
  setCardOpenDate: (instanceId: string, dateStr: string) => void;
  toggleBenefit: (logKey: string) => void;
  updateProgressLog: (logKey: string, spent: number) => void; // Updates linear spent progress values
  toggleTheme: () => void;
  toggleLanguage: () => void;
  
  // Google Drive Actions
  setGDriveCredentials: (token: string | null, email: string | null) => void;
  setSyncStatus: (status: 'disconnected' | 'syncing' | 'synced' | 'error') => void;
  syncWithGDrive: () => Promise<void>;
  setCustomClientId: (clientId: string | null) => void;

  resetAll: () => void;
}

// Helper to generate log key based on reset period and current date
export const getLogKey = (
  resetPeriod: 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed',
  instanceId: string, // Unique instance ID
  benefitId: string,
  currentDate: Date,
  cardOpenDateStr?: string, // 'YYYY-MM-DD'
  expirationDateStr?: string // 'YYYY-MM-DD' for fixed benefits
): string => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  switch (resetPeriod) {
    case 'monthly':
      const monthStr = month.toString().padStart(2, '0');
      return `${year}-${monthStr}:${instanceId}:${benefitId}`;

    case 'quarterly':
      const quarter = Math.ceil(month / 3); // Q1, Q2, Q3, Q4
      return `${year}-Q${quarter}:${instanceId}:${benefitId}`;

    case 'semi-annual':
      const half = month <= 6 ? 'H1' : 'H2';
      return `${year}-${half}:${instanceId}:${benefitId}`;

    case 'annual-calendar':
      return `${year}:${instanceId}:${benefitId}`;

    case 'annual-anniversary':
      if (cardOpenDateStr) {
        const openDate = new Date(cardOpenDateStr + 'T00:00:00');
        const currentAnniv = new Date(year, openDate.getMonth(), openDate.getDate());
        
        let start: Date;
        let end: Date;

        if (currentDate < currentAnniv) {
          start = new Date(year - 1, openDate.getMonth(), openDate.getDate());
          end = currentAnniv;
        } else {
          start = currentAnniv;
          end = new Date(year + 1, openDate.getMonth(), openDate.getDate());
        }

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        return `anniv:${startStr}:${endStr}:${instanceId}:${benefitId}`;
      }
      return `${year}-anniversary:${instanceId}:${benefitId}`;

    case 'fixed':
      return `fixed:${instanceId}:${benefitId}:${expirationDateStr || 'no-date'}`;

    default:
      return `${year}-${month}:${instanceId}:${benefitId}`;
  }
};

// Helper to push updates to Google Drive silently in the background
const syncPushToCloud = async (token: string | null, ownedCards: OwnedCardInstance[], logs: Record<string, boolean | number>) => {
  if (!token) return;
  try {
    const fileId = await findSyncFile(token);
    await uploadSyncFile(token, fileId, { ownedCards, logs });
  } catch (err) {
    console.error('Silent background cloud sync failed:', err);
  }
};

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      ownedCards: [],
      logs: {},
      theme: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark',
      language: (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en',
      
      // Google Drive Initial States (Not persisted in LocalStorage for absolute safety!)
      gdriveToken: null,
      gdriveEmail: null,
      syncStatus: 'disconnected',
      lastSyncedTime: null,
      customClientId: null, // Initially null, loaded via persisted storage

      addCard: (templateId) =>
        set((state) => {
          const template = CARDS_DB.find((c) => c.id === templateId);
          if (!template) return state;

          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

          const newInstance: OwnedCardInstance = {
            id: uniqueId,
            templateId,
            customName: template.name,
            cardOpenDate: todayStr,
            annualFee: template.annualFee,
          };

          const nextCards = [...state.ownedCards, newInstance];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
          };
        }),

      addCustomCard: (customCard) =>
        set((state) => {
          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newInstance: OwnedCardInstance = {
            ...customCard,
            id: uniqueId,
          };
          
          const nextCards = [...state.ownedCards, newInstance];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
          };
        }),

      removeCard: (instanceId) =>
        set((state) => {
          const nextCards = state.ownedCards.filter((c) => c.id !== instanceId);
          const nextLogs = Object.keys(state.logs).reduce((acc, key) => {
            const parts = key.split(':');
            if (parts[1] !== instanceId) {
              acc[key] = state.logs[key];
            }
            return acc;
          }, {} as Record<string, boolean | number>);

          syncPushToCloud(state.gdriveToken, nextCards, nextLogs);

          return {
            ownedCards: nextCards,
            logs: nextLogs,
          };
        }),

      renameCard: (instanceId, customName) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, customName: customName.trim() || c.customName } : c
          );
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
          };
        }),

      setCardOpenDate: (instanceId, dateStr) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, cardOpenDate: dateStr } : c
          );
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
          };
        }),

      toggleBenefit: (logKey) =>
        set((state) => {
          const nextLogs = {
            ...state.logs,
            [logKey]: !state.logs[logKey],
          };
          syncPushToCloud(state.gdriveToken, state.ownedCards, nextLogs);

          return {
            logs: nextLogs,
          };
        }),

      updateProgressLog: (logKey, spent) =>
        set((state) => {
          const nextLogs = {
            ...state.logs,
            [logKey]: Math.max(0, spent),
          };
          syncPushToCloud(state.gdriveToken, state.ownedCards, nextLogs);

          return {
            logs: nextLogs,
          };
        }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      toggleLanguage: () =>
        set((state) => ({
          language: state.language === 'zh' ? 'en' : 'zh',
        })),

      // Google Drive Actions
      setGDriveCredentials: (token, email) =>
        set(() => ({
          gdriveToken: token,
          gdriveEmail: email,
          syncStatus: token ? 'synced' : 'disconnected',
        })),

      setSyncStatus: (status) =>
        set(() => ({
          syncStatus: status,
        })),

      setCustomClientId: (clientId) =>
        set(() => ({
          customClientId: clientId ? clientId.trim() : null,
        })),

      syncWithGDrive: async () => {
        const { gdriveToken, ownedCards, logs } = get();
        if (!gdriveToken) return;

        set({ syncStatus: 'syncing' });
        try {
          const fileId = await findSyncFile(gdriveToken);
          if (!fileId) {
            // No backup file exists yet, upload current local state
            const dataToUpload = { ownedCards, logs };
            await uploadSyncFile(gdriveToken, null, dataToUpload);
            set({ 
              syncStatus: 'synced', 
              lastSyncedTime: new Date().toLocaleTimeString() 
            });
          } else {
            // Backup file exists, download and perform two-way merge
            const remoteData = await downloadSyncFile(gdriveToken, fileId);
            const remoteCards = remoteData.ownedCards || [];
            const remoteLogs = remoteData.logs || {};

            // 1. Merge owned cards by unique ID (union)
            const localCards = [...ownedCards];
            const mergedCards = [...localCards];
            
            remoteCards.forEach((rc: OwnedCardInstance) => {
              const exists = localCards.some((lc) => lc.id === rc.id);
              if (!exists) {
                mergedCards.push(rc);
              }
            });

            // 2. Merge logs by deterministic key
            const mergedLogs = { ...logs };
            Object.entries(remoteLogs).forEach(([key, val]) => {
              if (mergedLogs[key] === undefined) {
                mergedLogs[key] = val as boolean | number;
              } else if (typeof val === 'number' && typeof mergedLogs[key] === 'number') {
                // For progressive spent limits, pick the higher spending progress
                mergedLogs[key] = Math.max(Number(mergedLogs[key]), Number(val));
              } else if (val === true || mergedLogs[key] === true) {
                // For binary statement credits, if one is checked, it is completed
                mergedLogs[key] = true;
              }
            });

            // 3. Upload merged state back to Drive and save locally
            const finalMergedData = { ownedCards: mergedCards, logs: mergedLogs };
            await uploadSyncFile(gdriveToken, fileId, finalMergedData);

            set({
              ownedCards: mergedCards,
              logs: mergedLogs,
              syncStatus: 'synced',
              lastSyncedTime: new Date().toLocaleTimeString()
            });
          }
        } catch (err) {
          set({ syncStatus: 'error' });
          throw err;
        }
      },

      resetAll: () =>
        set(() => ({
          ownedCards: [],
          logs: {},
          // Keep theme preference intact
        })),
    }),
    {
      name: 'cc-benefits-tracker-storage',
      // Do NOT persist Google Drive credentials in LocalStorage to maintain 100% security
      partialize: (state) => ({
        ownedCards: state.ownedCards,
        logs: state.logs,
        theme: state.theme,
        language: state.language,
        customClientId: state.customClientId, // Persist the custom Client ID
      }),
    }
  )
);
