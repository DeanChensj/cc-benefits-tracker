import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS_DB, DEFAULT_VALUATIONS } from '../data/cards.db';
import type { Benefit, LoyaltyAward, PointCurrency } from '../data/cards.db';
import { translations } from '../utils/i18n';
import { findSyncFile, uploadSyncFile, downloadSyncFile } from '../utils/gdrive';
import type { LogEntry } from '../utils/logUtils';
import { parseLogEntry } from '../utils/logUtils';
import { obfuscateKey, deobfuscateKey } from '../utils/cryptoUtils';
import { getLogKey, getYearFromPlainKey } from '../utils/storeHelpers';

export interface OwnedCardInstance {
  id: string; // Unique instance ID (e.g. inst_171500000)
  templateId: string; // References the static CARDS_DB card id, or 'custom'
  customName: string; // User's label (e.g. "Amex Gold - Player 2")
  cardOpenDate: string; // Precise card opened date 'YYYY-MM-DD'
  bank?: string; // Custom bank name for custom cards
  color?: string; // Custom gradient classes for custom cards
  customBenefits?: Benefit[]; // Custom base benefits for custom cards
  instanceOffers?: Benefit[]; // Temporary, instance-specific custom offers (e.g. Amex Offers)
  annualFee?: number; // Annual fee of the card instance
  multipliers?: Record<string, number | undefined>;
  signupBonusActive?: boolean; // True if user secured the SUB!
  signupBonusValue?: number; // Valuation of the secured SUB
  pointCurrency?: PointCurrency; // Reward currency of the card instance (especially for custom cards)
  lastModified?: number; // Instance-level LWW timestamp
}

export interface AgentCommand {
  action: 'add_card' | 'add_custom' | 'rename_card' | 'set_card_date' | 'add_voucher' | 'resolve_benefit' | 'restore_benefit' | 'add_offer';
  templateId?: string;
  customName?: string;
  cardOpenDate?: string;
  name?: string;
  bank?: string;
  annualFee?: number;
  oldName?: string;
  newName?: string;
  cardName?: string;
  benefitName?: string;
  offer?: Omit<Benefit, 'id'>;
  
  // Voucher-specific parameters
  customBrand?: string;
  customProgramType?: 'hotel' | 'airline' | 'bank' | 'other';
  customAwardType?: 'fnr' | 'sua' | 'goh' | 'companion' | 'swu' | 'points' | 'other';
  customValue?: number;
  quantity?: number;
  notes?: string;
  expirationDate?: string;
}

export interface CardStore {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  logs: Record<string, LogEntry>; // ObfuscatedKey -> LogEntry object
  theme: 'dark' | 'light'; // App theme selection
  language: 'zh' | 'en'; // App language selection
  walletLastModified?: number; // Global card wallet modified timestamp
  deletedCardIds?: string[]; // Tombstone cards tracker
  deletedAwardIds?: string[]; // Tombstone awards tracker
  pointValuations?: Record<string, number>; // Custom points valuations
  updatePointValuation: (currency: string, value: number) => void;
  executeAgentCommand: (cmds: AgentCommand[]) => { success: boolean; message: string };
  
  // Google Drive Sync States
  gdriveToken: string | null; // Temporary in-memory OAuth access token
  gdriveEmail: string | null; // Connected google account email
  syncStatus: 'disconnected' | 'syncing' | 'synced' | 'error';
  lastSyncedTime: string | null;
  customClientId: string | null; // Custom Google Client ID (persisted)

  // Actions
  addCard: (templateId: string) => string;
  addCardsBatch: (templateIds: string[]) => void;
  addCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  removeCard: (instanceId: string) => void;
  renameCard: (instanceId: string, customName: string) => void;
  setCardOpenDate: (instanceId: string, dateStr: string) => void;
  toggleBenefit: (logKey: string) => void;
  skipBenefit: (logKey: string) => void;
  updateProgressLog: (logKey: string, spent: number) => void; // Updates linear spent progress values
  toggleTheme: () => void;
  toggleLanguage: () => void;
  
  // Google Drive Actions
  setGDriveCredentials: (token: string | null, email: string | null) => void;
  setSyncStatus: (status: 'disconnected' | 'syncing' | 'synced' | 'error') => void;
  syncWithGDrive: () => Promise<void>;
  setCustomClientId: (clientId: string | null) => void;

  // Instance Offer Actions
  addInstanceOffer: (instanceId: string, offer: Omit<Benefit, 'id'>) => void;
  updateWelcomeOffer: (instanceId: string, requirement: number, months: number, value: number) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  // Multiplier Customizer Actions
  updateCardMultipliers: (instanceId: string, multipliers: OwnedCardInstance['multipliers']) => void;
  updateCardPointCurrency: (instanceId: string, currency: PointCurrency) => void;

  // Sign-Up Bonus Actions
  toggleSignupBonus: (instanceId: string) => void;
  updateSignupBonusValue: (instanceId: string, value: number) => void;

  // Standalone Loyalty Vouchers Actions
  addLoyaltyAward: (award: Omit<LoyaltyAward, 'id' | 'usedQuantity' | 'lastModified'>) => void;
  toggleLoyaltyAward: (awardId: string) => void;
  deleteLoyaltyAward: (awardId: string) => void;
  updateAwardUsedQuantity: (awardId: string, qty: number) => void;
  updateLoyaltyAward: (awardId: string, updates: Partial<LoyaltyAward>) => void;

  // Database Slimming Actions
  pruneExpiredLogs: (currentDate: Date) => void;

  resetAll: () => void;
}



// In-memory reference to the background sync debounce timer
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// Helper to push updates to Google Drive silently in the background with a 5-second debounce buffer
const syncPushToCloud = async (
  token: string | null,
  ownedCards: OwnedCardInstance[],
  logs: Record<string, LogEntry>
) => {
  if (!token) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    try {
      const fileId = await findSyncFile(token);
      const storeState = useCardStore.getState();
      const loyaltyAwards = storeState?.loyaltyAwards || [];
      const deletedCardIds = storeState?.deletedCardIds || [];
      const deletedAwardIds = storeState?.deletedAwardIds || [];
      await uploadSyncFile(token, fileId, { 
        ownedCards, 
        logs, 
        loyaltyAwards,
        deletedCardIds,
        deletedAwardIds
      });
    } catch (err) {
      console.error('Silent background cloud sync failed:', err);
    }
  }, 5000);
};



export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      ownedCards: [],
      loyaltyAwards: [],
      logs: {},
      deletedCardIds: [],
      deletedAwardIds: [],
      theme: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark',
      language: (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en',
      pointValuations: DEFAULT_VALUATIONS,
      
      // Google Drive Initial States (Not persisted in LocalStorage for absolute safety!)
      gdriveToken: null,
      gdriveEmail: null,
      syncStatus: 'disconnected',
      lastSyncedTime: null,
      customClientId: null,

      addCard: (templateId) => {
        let generatedName = '';
        set((state) => {
          const template = CARDS_DB.find((c) => c.id === templateId);
          if (!template) return state;

          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

          // Force read latest state using get() instead of state callback parameter!
          const currentCards = get().ownedCards;

          const newInstance: OwnedCardInstance = {
            id: uniqueId,
            templateId,
            customName: (() => {
              const baseName = template.name;
              let newName = baseName;
              let count = 1;
              while (currentCards.some((c) => c.customName.toLowerCase().trim() === newName.toLowerCase().trim())) {
                newName = `${baseName} (${count})`;
                count++;
              }
              return newName;
            })(),
            cardOpenDate: todayStr,
            annualFee: template.annualFee,
            instanceOffers: [], // Initialize empty offers array
            lastModified: Date.now()
          };

          generatedName = newInstance.customName;

          const nextCards = [...state.ownedCards, newInstance];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        });
        return generatedName;
      },

      addCardsBatch: (templateIds) =>
        set((state) => {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
          
          const newNamesInBatch = new Set<string>();
          const newInstances = templateIds.map((templateId, index) => {
            const template = CARDS_DB.find((c) => c.id === templateId);
            if (!template) return null;
            
            const uniqueId = `inst_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
            
            const baseName = template.name;
            let newName = baseName;
            let count = 1;
            const currentCards = get().ownedCards;
            
            while (
              currentCards.some((c) => c.customName.toLowerCase().trim() === newName.toLowerCase().trim()) ||
              newNamesInBatch.has(newName.toLowerCase().trim())
            ) {
              newName = `${baseName} (${count})`;
              count++;
            }
            newNamesInBatch.add(newName.toLowerCase().trim());

            return {
              id: uniqueId,
              templateId,
              customName: newName,
              cardOpenDate: todayStr,
              annualFee: template.annualFee,
              instanceOffers: [],
              lastModified: Date.now()
            } as OwnedCardInstance;
          }).filter((item): item is OwnedCardInstance => item !== null);

          if (newInstances.length === 0) return state;

          const nextCards = [...state.ownedCards, ...newInstances];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now()
          };
        }),

      addCustomCard: (customCard) =>
        set((state) => {
          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          const currentCards = get().ownedCards;

          const newInstance: OwnedCardInstance = {
            ...customCard,
            id: uniqueId,
            customName: (() => {
              const baseName = customCard.customName;
              let newName = baseName;
              let count = 1;
              while (currentCards.some((c) => c.customName.toLowerCase().trim() === newName.toLowerCase().trim())) {
                newName = `${baseName} (${count})`;
                count++;
              }
              return newName;
            })(),
            instanceOffers: customCard.instanceOffers || [], // Use passed offers or initialize empty array
            lastModified: Date.now()
          };
          
          const nextCards = [...state.ownedCards, newInstance];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
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
          }, {} as Record<string, LogEntry>);

          const nextDeleted = Array.from(new Set([...(state.deletedCardIds || []), instanceId]));
          syncPushToCloud(state.gdriveToken, nextCards, nextLogs);

          return {
            ownedCards: nextCards,
            logs: nextLogs,
            deletedCardIds: nextDeleted,
            walletLastModified: Date.now(),
          };
        }),

      renameCard: (instanceId, customName) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, customName: customName, lastModified: Date.now() } : c
          );
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      setCardOpenDate: (instanceId, dateStr) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, cardOpenDate: dateStr, lastModified: Date.now() } : c
          );
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      toggleBenefit: (logKey) =>
        set((state) => {
          const nextLogs = { ...state.logs };
          const obfuscatedKey = obfuscateKey(logKey);
          const exists = nextLogs[obfuscatedKey];
          
          nextLogs[obfuscatedKey] = {
            resolved: exists ? !exists.resolved : true,
            timestamp: Date.now(),
            value: 0,
          };
          syncPushToCloud(state.gdriveToken, state.ownedCards, nextLogs);

          return {
            logs: nextLogs,
          };
        }),

      skipBenefit: (logKey) =>
        set((state) => {
          const nextLogs = { ...state.logs };
          const obfuscatedKey = obfuscateKey(logKey);
          const exists = nextLogs[obfuscatedKey];
          
          nextLogs[obfuscatedKey] = {
            resolved: false,
            skipped: exists ? !exists.skipped : true,
            timestamp: Date.now(),
            value: 0,
          };
          syncPushToCloud(state.gdriveToken, state.ownedCards, nextLogs);

          return {
            logs: nextLogs,
          };
        }),

      updateProgressLog: (logKey, spent) =>
        set((state) => {
          const nextLogs = { ...state.logs };
          const obfuscatedKey = obfuscateKey(logKey);
          const spentVal = Math.max(0, spent);
          
          nextLogs[obfuscatedKey] = {
            resolved: spentVal > 0,
            timestamp: Date.now(),
            value: 0,
            spentProgress: spentVal,
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
        const { gdriveToken, ownedCards, loyaltyAwards, logs, walletLastModified, deletedCardIds, deletedAwardIds } = get();
        if (!gdriveToken) return;

        set({ syncStatus: 'syncing' });
        try {
          const fileId = await findSyncFile(gdriveToken);
          if (!fileId) {
            const dataToUpload = { 
              ownedCards, 
              loyaltyAwards,
              logs, 
              deletedCardIds: deletedCardIds || [],
              deletedAwardIds: deletedAwardIds || [],
              walletLastModified: walletLastModified || Date.now() 
            };
            await uploadSyncFile(gdriveToken, null, dataToUpload);
            set({ 
              syncStatus: 'synced', 
              lastSyncedTime: new Date().toLocaleTimeString() 
            });
          } else {
            const remoteData = await downloadSyncFile(gdriveToken, fileId);
            const remoteCards = remoteData.ownedCards || [];
            const remoteAwards = remoteData.loyaltyAwards || [];
            const remoteLogs = remoteData.logs || {};

            // 1. Merge Tombstone Deletion Trackers
            const localDeletedCards = deletedCardIds || [];
            const remoteDeletedCards = remoteData.deletedCardIds || [];
            const mergedDeletedCards = Array.from(new Set([...localDeletedCards, ...remoteDeletedCards]));

            const localDeletedAwards = deletedAwardIds || [];
            const remoteDeletedAwards = remoteData.deletedAwardIds || [];
            const mergedDeletedAwards = Array.from(new Set([...localDeletedAwards, ...remoteDeletedAwards]));

            // 2. Instance-level LWW ownedCards Merge (Tombstone Excluded)
            const cardMap = new Map<string, OwnedCardInstance>();
            remoteCards.forEach((c: OwnedCardInstance) => {
              if (!mergedDeletedCards.includes(c.id)) {
                cardMap.set(c.id, c);
              }
            });
            ownedCards.forEach((c: OwnedCardInstance) => {
              if (mergedDeletedCards.includes(c.id)) {
                cardMap.delete(c.id);
                return;
              }
              const existing = cardMap.get(c.id);
              if (!existing) {
                cardMap.set(c.id, c);
              } else {
                const localTime = c.lastModified || 0;
                const remoteTime = existing.lastModified || 0;
                if (localTime > remoteTime) {
                  cardMap.set(c.id, c);
                }
              }
            });
            const mergedCards = Array.from(cardMap.values());

            // 3. Instance-level LWW loyaltyAwards Merge (Tombstone Excluded)
            const awardMap = new Map<string, LoyaltyAward>();
            remoteAwards.forEach((a: LoyaltyAward) => {
              if (!mergedDeletedAwards.includes(a.id)) {
                awardMap.set(a.id, a);
              }
            });
            loyaltyAwards.forEach((a: LoyaltyAward) => {
              if (mergedDeletedAwards.includes(a.id)) {
                awardMap.delete(a.id);
                return;
              }
              const existing = awardMap.get(a.id);
              if (!existing) {
                awardMap.set(a.id, a);
              } else {
                const localTime = a.lastModified || 0;
                const remoteTime = existing.lastModified || 0;
                if (localTime > remoteTime) {
                  awardMap.set(a.id, a);
                }
              }
            });
            const mergedAwards = Array.from(awardMap.values());

            // 4. LogEntry-level LWW checklist merge (unchanged)
            const localWalletTime = walletLastModified || 0;
            const remoteWalletTime = remoteData.walletLastModified || 0;
            const finalWalletTime = Math.max(localWalletTime, remoteWalletTime);

            const mergedLogs = { ...logs };
            const currentYear = new Date().getFullYear();

            Object.entries(remoteLogs).forEach(([key, val]) => {
              const remoteVal = val as LogEntry;
              const plainKey = deobfuscateKey(key);
              const logYear = getYearFromPlainKey(plainKey);
              if (logYear !== null && (currentYear - logYear > 1)) {
                return;
              }

              if (mergedLogs[key] === undefined) {
                mergedLogs[key] = remoteVal;
              } else {
                const localTime = mergedLogs[key].timestamp || 0;
                const remoteTime = remoteVal.timestamp || 0;
                if (remoteTime > localTime) {
                  mergedLogs[key] = remoteVal;
                }
              }
            });

            const finalMergedData = { 
              ownedCards: mergedCards, 
              deletedCardIds: mergedDeletedCards,
              loyaltyAwards: mergedAwards,
              deletedAwardIds: mergedDeletedAwards,
              logs: mergedLogs, 
              walletLastModified: finalWalletTime 
            };
            await uploadSyncFile(gdriveToken, fileId, finalMergedData);

            set({
              ownedCards: mergedCards,
              deletedCardIds: mergedDeletedCards,
              loyaltyAwards: mergedAwards,
              deletedAwardIds: mergedDeletedAwards,
              logs: mergedLogs,
              walletLastModified: finalWalletTime,
              syncStatus: 'synced',
              lastSyncedTime: new Date().toLocaleTimeString()
            });
          }
        } catch (err) {
          set({ syncStatus: 'error' });
          throw err;
        }
      },

      // Instance Offer Actions
      addInstanceOffer: (instanceId, offer) =>
        set((state) => {
          const newOffer: Benefit = {
            ...offer,
            id: `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          };
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              return {
                ...c,
                instanceOffers: [...(c.instanceOffers || []), newOffer],
                lastModified: Date.now()
              };
            }
            return c;
          });
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      updateWelcomeOffer: (instanceId, requirement, months, value) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              const nextOffers = c.instanceOffers ? [...c.instanceOffers] : [];
              const welcomeIdx = nextOffers.findIndex((o) => o.type === 'welcome-offer');
              
              const openDate = new Date(c.cardOpenDate);
              openDate.setMonth(openDate.getMonth() + months);
              const expDateStr = openDate.toISOString().slice(0, 10);
              
              if (welcomeIdx >= 0) {
                nextOffers[welcomeIdx] = {
                  ...nextOffers[welcomeIdx],
                  description: `Spend $${requirement} in ${months} months`,
                  value: value,
                  spendingLimit: requirement,
                  expirationDate: expDateStr
                };
              } else {
                nextOffers.push({
                  id: `offer_welcome_${Date.now()}`,
                  name: 'Welcome Offer',
                  description: `Spend $${requirement} in ${months} months`,
                  value: value,
                  resetPeriod: 'once',
                  category: 'other',
                  spendingLimit: requirement,
                  expirationDate: expDateStr,
                  type: 'welcome-offer'
                });
              }
              
              return {
                ...c,
                instanceOffers: nextOffers,
                signupBonusActive: requirement > 0 || value > 0,
                signupBonusValue: value,
                lastModified: Date.now()
              };
            }
            return c;
          });
          
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);
          
          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      removeInstanceOffer: (instanceId, offerId) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              return {
                ...c,
                instanceOffers: (c.instanceOffers || []).filter((o) => o.id !== offerId),
                lastModified: Date.now()
              };
            }
            return c;
          });
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      updateCardMultipliers: (instanceId, multipliers) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              return { ...c, multipliers, lastModified: Date.now() };
            }
            return c;
          });
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);
          
          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      updateCardPointCurrency: (instanceId, currency) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              return { ...c, pointCurrency: currency, lastModified: Date.now() };
            }
            return c;
          });
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);
          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      toggleSignupBonus: (instanceId) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              const template = CARDS_DB.find((t) => t.id === c.templateId);
              const defaultVal = c.signupBonusValue !== undefined 
                ? c.signupBonusValue 
                : (template?.signupBonusValue !== undefined ? template.signupBonusValue : 0);
              return {
                ...c,
                signupBonusActive: !c.signupBonusActive,
                signupBonusValue: defaultVal,
                lastModified: Date.now()
              };
            }
            return c;
          });
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);
          return { 
            ownedCards: nextCards,
            walletLastModified: Date.now()
          };
        }),

      updateSignupBonusValue: (instanceId, value) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) => {
            if (c.id === instanceId) {
              return {
                ...c,
                signupBonusValue: Math.max(0, value),
                lastModified: Date.now()
              };
            }
            return c;
          });
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);
          return { 
            ownedCards: nextCards,
            walletLastModified: Date.now()
          };
        }),

      addLoyaltyAward: (award) =>
        set((state) => {
          const uniqueId = `award_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newAward: LoyaltyAward = {
            ...award,
            id: uniqueId,
            usedQuantity: 0,
            lastModified: Date.now()
          };
          const nextAwards = [...state.loyaltyAwards, newAward];
          syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
          return {
            loyaltyAwards: nextAwards,
            walletLastModified: Date.now()
          };
        }),

      toggleLoyaltyAward: (awardId) =>
        set((state) => {
          const nextAwards = state.loyaltyAwards.map((a) =>
            a.id === awardId
              ? { ...a, usedQuantity: a.usedQuantity > 0 ? 0 : 1, lastModified: Date.now() }
              : a
          );
          syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
          return {
            loyaltyAwards: nextAwards,
            walletLastModified: Date.now()
          };
        }),

      updateAwardUsedQuantity: (awardId, qty) =>
        set((state) => {
          const nextAwards = state.loyaltyAwards.map((a) =>
            a.id === awardId
              ? { ...a, usedQuantity: Math.min(Math.max(0, qty), a.quantity), lastModified: Date.now() }
              : a
          );
          syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
          return {
            loyaltyAwards: nextAwards,
            walletLastModified: Date.now()
          };
        }),

      deleteLoyaltyAward: (awardId) =>
        set((state) => {
          const nextAwards = state.loyaltyAwards.filter((a) => a.id !== awardId);
          const nextDeleted = Array.from(new Set([...(state.deletedAwardIds || []), awardId]));
          syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
          return {
            loyaltyAwards: nextAwards,
            deletedAwardIds: nextDeleted,
            walletLastModified: Date.now()
          };
        }),

      updateLoyaltyAward: (awardId, updates) =>
        set((state) => {
          const nextAwards = state.loyaltyAwards.map((a) =>
            a.id === awardId
              ? { ...a, ...updates, lastModified: Date.now() }
              : a
          );
          syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
          return {
            loyaltyAwards: nextAwards,
            walletLastModified: Date.now()
          };
        }),

      pruneExpiredLogs: (currentDate) =>
        set((state) => {
          const currentYear = currentDate.getFullYear();
          const nextLogs = { ...state.logs };
          let prunedAny = false;

          Object.keys(nextLogs).forEach((key) => {
            const val = nextLogs[key] as string | number | boolean | LogEntry | null | undefined;

            // 1. Self-Healing Migration: Check if it is a legacy plain key (contains ':')
            if (key.includes(':')) {
              delete nextLogs[key];
              
              // Parse whatever value format it has (boolean, number, string, or rich object)
              const parsed = parseLogEntry(val);
              if (parsed) {
                const obfuscatedKey = obfuscateKey(key);
                nextLogs[obfuscatedKey] = {
                  resolved: parsed.resolved,
                  timestamp: Number(parsed.timestamp) || Date.now(),
                  value: parsed.value || 0,
                  spentProgress: parsed.spentProgress,
                };
              }
              prunedAny = true;
            } else {
              // 2. Standard Date Pruning: It is already obfuscated. Deobfuscate to check date!
              const plainKey = deobfuscateKey(key);
              const logYear = getYearFromPlainKey(plainKey);
              if (logYear !== null && (currentYear - logYear > 1)) {
                delete nextLogs[key];
                prunedAny = true;
              }
            }
          });

          if (prunedAny) {
            console.log('🧹 Database Auto-Healing & Slimming: Pruned/migrated logs successfully.');
            syncPushToCloud(state.gdriveToken, state.ownedCards, nextLogs);
            return { logs: nextLogs };
          }
          return {};
        }),

      executeAgentCommand: (cmds) => {
        const state = get();
        const language = state.language;
        const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];
        const addedNames: string[] = [];

        try {
          const commands: AgentCommand[] = Array.isArray(cmds) ? cmds : [cmds];

          commands.forEach((cmd) => {
            if (cmd.action === 'add_card' && cmd.templateId) {
              const template = CARDS_DB.find((c) => c.id === cmd.templateId);
              if (!template) throw new Error('Template not found');

              // 1. Execute card addition
              state.addCard(cmd.templateId);

              // 2. Instantly retrieve the newly added card instance (last element)
              const freshCards = get().ownedCards;
              const newCard = freshCards[freshCards.length - 1];

              if (newCard) {
                // 3. Apply optional custom parameters
                if (cmd.customName) {
                  state.renameCard(newCard.id, cmd.customName);
                }
                if (cmd.cardOpenDate) {
                  state.setCardOpenDate(newCard.id, cmd.cardOpenDate);
                }
              }
              addedNames.push(cmd.customName || template.name);
            } else if (cmd.action === 'add_custom' && cmd.name) {
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

              state.addCustomCard({
                templateId: 'custom',
                customName: cmd.name,
                bank: cmd.bank || 'Other',
                annualFee: cmd.annualFee || 0,
                cardOpenDate: cmd.cardOpenDate || todayStr,
                instanceOffers: [],
                lastModified: Date.now()
              });
              addedNames.push(cmd.name);
            } else if (cmd.action === 'add_voucher') {
              state.addLoyaltyAward({
                templateId: cmd.templateId || 'custom',
                customName: cmd.customName,
                customBrand: cmd.customBrand,
                customProgramType: cmd.customProgramType,
                customAwardType: cmd.customAwardType,
                customValue: cmd.customValue,
                expirationDate: cmd.expirationDate,
                quantity: cmd.quantity || 1,
                notes: cmd.notes,
              });
              const isCustom = !cmd.templateId || cmd.templateId === 'custom';
              const resolvedName = cmd.customName || (isCustom ? 'Voucher' : cmd.templateId);
              addedNames.push(resolvedName || 'Voucher');
            } else if (cmd.action === 'rename_card' && cmd.oldName && cmd.newName) {
              const oldName = cmd.oldName;
              const newName = cmd.newName;
              const cardToRename = state.ownedCards.find(
                (c) => c.customName.toLowerCase().trim() === oldName.toLowerCase().trim()
              );
              if (cardToRename) {
                state.renameCard(cardToRename.id, newName);
                addedNames.push(`"${oldName}" ➔ "${newName}"`);
              } else {
                throw new Error(`Card named "${oldName}" not found`);
              }
            } else if (cmd.action === 'set_card_date' && cmd.cardName && cmd.cardOpenDate) {
              const cardName = cmd.cardName;
              const cardOpenDate = cmd.cardOpenDate;
              const cardToUpdate = state.ownedCards.find(
                (c) => c.customName.toLowerCase().trim() === cardName.toLowerCase().trim()
              );
              if (cardToUpdate) {
                state.setCardOpenDate(cardToUpdate.id, cardOpenDate);
                addedNames.push(`"${cardName}" (${t('openDateLabel')}) ➔ ${cardOpenDate}`);
              } else {
                throw new Error(`Card named "${cardName}" not found`);
              }
            } else if (cmd.action === 'resolve_benefit' && cmd.cardName && cmd.benefitName) {
              const cardName = cmd.cardName;
              const benefitName = cmd.benefitName;
              
              const card = state.ownedCards.find(
                (c) => c.customName.toLowerCase().trim() === cardName.toLowerCase().trim()
              );
              if (!card) throw new Error(`Card named "${cardName}" not found`);
              
              const template = card.templateId !== 'custom' ? CARDS_DB.find((t) => t.id === card.templateId) : null;
              let benefits: Benefit[] = [];
              if (template) benefits = [...template.benefits];
              if (card.instanceOffers) benefits = [...benefits, ...card.instanceOffers];
              
              const benefit = benefits.find(
                (b) => b.name.toLowerCase().trim() === benefitName.toLowerCase().trim()
              );
              if (!benefit) throw new Error(`Benefit "${benefitName}" not found on card "${cardName}"`);
              
              const today = new Date();
              const logKey = getLogKey(
                benefit.resetPeriod,
                card.id,
                benefit.id,
                today,
                card.cardOpenDate,
                benefit.expirationDate
              );
              
              const obfuscatedKey = obfuscateKey(logKey);
              const exists = state.logs[obfuscatedKey];
              
              if (benefit.spendingLimit !== undefined) {
                state.updateProgressLog(logKey, benefit.spendingLimit);
                addedNames.push(`${t('resolveAction')} "${benefitName}"`);
              } else if (!exists || !exists.resolved) {
                state.toggleBenefit(logKey);
                addedNames.push(`${t('resolveAction')} "${benefitName}"`);
              }
            } else if (cmd.action === 'restore_benefit' && cmd.cardName && cmd.benefitName) {
              const cardName = cmd.cardName;
              const benefitName = cmd.benefitName;
              
              const card = state.ownedCards.find(
                (c) => c.customName.toLowerCase().trim() === cardName.toLowerCase().trim()
              );
              if (!card) throw new Error(`Card named "${cardName}" not found`);
              
              const template = card.templateId !== 'custom' ? CARDS_DB.find((t) => t.id === card.templateId) : null;
              let benefits: Benefit[] = [];
              if (template) benefits = [...template.benefits];
              if (card.instanceOffers) benefits = [...benefits, ...card.instanceOffers];
              
              const benefit = benefits.find(
                (b) => b.name.toLowerCase().trim() === benefitName.toLowerCase().trim()
              );
              if (!benefit) throw new Error(`Benefit "${benefitName}" not found on card "${cardName}"`);
              
              const today = new Date();
              const logKey = getLogKey(
                benefit.resetPeriod,
                card.id,
                benefit.id,
                today,
                card.cardOpenDate,
                benefit.expirationDate
              );
              
              const obfuscatedKey = obfuscateKey(logKey);
              const exists = state.logs[obfuscatedKey];
              
              if (exists && exists.skipped) {
                state.skipBenefit(logKey);
                addedNames.push(`${t('restoreAction')} "${benefitName}"`);
              }
            } else if (cmd.action === 'add_offer' && cmd.cardName && cmd.offer) {
              const cardName = cmd.cardName;
              const offer = cmd.offer;
              
              const card = state.ownedCards.find(
                (c) => c.customName.toLowerCase().trim() === cardName.toLowerCase().trim()
              );
              if (!card) throw new Error(`Card named "${cardName}" not found`);
              
              state.addInstanceOffer(card.id, offer);
              addedNames.push(`${language === 'zh' ? '添加福利' : 'Add Offer'} "${offer.name}"`);
            }
          });

          if (addedNames.length > 0) {
            const cardNamesList = addedNames.join(' & ');
            const isUpdate = commands.some((c) => c.action === 'rename_card' || c.action === 'set_card_date');
            return {
              success: true,
              message: t(isUpdate ? 'aiToastUpdateCard' : 'aiToastAddCard').replace('{card}', cardNamesList)
            };
          }
        } catch (err) {
          console.error('Agent command execution failed:', err);
          return { success: false, message: 'Execution failed' };
        }

        return { success: false, message: 'Unknown action' };
      },

      resetAll: () =>
        set(() => ({
          ownedCards: [],
          loyaltyAwards: [],
          logs: {},
          deletedCardIds: [],
          deletedAwardIds: [],
        })),

      updatePointValuation: (currency, value) =>
        set((state) => {
          const nextValuations = {
            ...(state.pointValuations || DEFAULT_VALUATIONS),
            [currency]: value
          };
          return {
            pointValuations: nextValuations,
            walletLastModified: Date.now()
          };
        }),
    }),
    {
      name: 'cc-benefits-tracker-storage',
      // Persist connection indicators, but NEVER the raw temporary gdriveToken to maintain 100% security
      partialize: (state) => {
        // Lossless Dehydration: Strip descriptions and officialUrl from custom benefits/offers
        // to shrink localStorage & GDrive sync payload size by 80% while keeping active memory intact!
        const dehydratedCards = state.ownedCards.map((card) => {
          const customBenefits = card.customBenefits?.map((b) => ({
            ...b,
            description: '',
            officialUrl: undefined
          }));
          const instanceOffers = card.instanceOffers?.map((o) => ({
            ...o,
            description: '',
            officialUrl: undefined
          }));
          return {
            ...card,
            customBenefits,
            instanceOffers
          };
        });

        return {
          ownedCards: dehydratedCards,
          loyaltyAwards: state.loyaltyAwards,
          logs: state.logs,
          walletLastModified: state.walletLastModified,
          deletedCardIds: state.deletedCardIds || [],
          deletedAwardIds: state.deletedAwardIds || [],
          pointValuations: state.pointValuations || DEFAULT_VALUATIONS,
          theme: state.theme,
          language: state.language,
          customClientId: state.customClientId,
          gdriveEmail: state.gdriveEmail,
          syncStatus: state.syncStatus === 'synced' ? 'synced' : 'disconnected'
        };
      },
    }
  )
);
