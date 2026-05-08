import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS_DB } from '../data/cards.db';
import type { Benefit, LoyaltyAward } from '../data/cards.db';
import { findSyncFile, uploadSyncFile, downloadSyncFile } from '../utils/gdrive';
import type { LogEntry } from '../utils/dateUtils';
import { obfuscateKey, deobfuscateKey, parseLogEntry } from '../utils/dateUtils';

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
}

export interface CardStore {
  ownedCards: OwnedCardInstance[];
  loyaltyAwards: LoyaltyAward[];
  logs: Record<string, LogEntry>; // ObfuscatedKey -> LogEntry object
  theme: 'dark' | 'light'; // App theme selection
  language: 'zh' | 'en'; // App language selection
  walletLastModified?: number; // Global card wallet modified timestamp
  
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

  // Instance Offer Actions
  addInstanceOffer: (instanceId: string, offer: Omit<Benefit, 'id'>) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  // Multiplier Customizer Actions
  updateCardMultipliers: (instanceId: string, multipliers: OwnedCardInstance['multipliers']) => void;

  // Sign-Up Bonus Actions
  toggleSignupBonus: (instanceId: string) => void;
  updateSignupBonusValue: (instanceId: string, value: number) => void;

  // Standalone Loyalty Vouchers Actions
  addLoyaltyAward: (award: Omit<LoyaltyAward, 'id' | 'isUsed' | 'lastModified'>) => void;
  toggleLoyaltyAward: (awardId: string) => void;
  deleteLoyaltyAward: (awardId: string) => void;
  updateLoyaltyAward: (awardId: string, updates: Partial<LoyaltyAward>) => void;

  // Database Slimming Actions
  pruneExpiredLogs: (currentDate: Date) => void;

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

// Helper to extract year from a legacy plain key (supports: monthly, quarterly, semi-annual, annual, anniv, fixed)
export const getYearFromPlainKey = (plainKey: string): number | null => {
  const match = plainKey.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper to push updates to Google Drive silently in the background
const syncPushToCloud = async (
  token: string | null,
  ownedCards: OwnedCardInstance[],
  logs: Record<string, LogEntry>
) => {
  if (!token) return;
  try {
    const fileId = await findSyncFile(token);
    const loyaltyAwards = useCardStore.getState()?.loyaltyAwards || [];
    await uploadSyncFile(token, fileId, { ownedCards, logs, loyaltyAwards });
  } catch (err) {
    console.error('Silent background cloud sync failed:', err);
  }
};

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      ownedCards: [],
      loyaltyAwards: [],
      logs: {},
      theme: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark',
      language: (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en',
      
      // Google Drive Initial States (Not persisted in LocalStorage for absolute safety!)
      gdriveToken: null,
      gdriveEmail: null,
      syncStatus: 'disconnected',
      lastSyncedTime: null,
      customClientId: null,

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
            instanceOffers: [], // Initialize empty offers array
          };

          const nextCards = [...state.ownedCards, newInstance];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
          };
        }),

      addCustomCard: (customCard) =>
        set((state) => {
          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newInstance: OwnedCardInstance = {
            ...customCard,
            id: uniqueId,
            instanceOffers: [], // Initialize empty offers array
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

          syncPushToCloud(state.gdriveToken, nextCards, nextLogs);

          return {
            ownedCards: nextCards,
            logs: nextLogs,
            walletLastModified: Date.now(),
          };
        }),

      renameCard: (instanceId, customName) =>
        set((state) => {
          const nextCards = state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, customName: customName } : c
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
            c.id === instanceId ? { ...c, cardOpenDate: dateStr } : c
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
        const { gdriveToken, ownedCards, loyaltyAwards, logs, walletLastModified } = get();
        if (!gdriveToken) return;

        set({ syncStatus: 'syncing' });
        try {
          const fileId = await findSyncFile(gdriveToken);
          if (!fileId) {
            const dataToUpload = { 
              ownedCards, 
              loyaltyAwards,
              logs, 
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

            // LWW Wallet Sync Shield: Compare global card wallet modified timestamps
            const localWalletTime = walletLastModified || 0;
            const remoteWalletTime = remoteData.walletLastModified || 0;
            
            const mergedCards = remoteWalletTime > localWalletTime 
              ? remoteCards 
              : ownedCards;

            const mergedAwards = remoteWalletTime > localWalletTime 
              ? remoteAwards 
              : loyaltyAwards;
            
            const finalWalletTime = Math.max(localWalletTime, remoteWalletTime);

            const mergedLogs = { ...logs };
            const currentYear = new Date().getFullYear();

            Object.entries(remoteLogs).forEach(([key, val]) => {
              const remoteVal = val as LogEntry;

              // 2-Year Pruning Shield: Check if this remote key is expired.
              const plainKey = deobfuscateKey(key);
              const logYear = getYearFromPlainKey(plainKey);
              if (logYear !== null && (currentYear - logYear > 1)) {
                return; // Skip, do not merge!
              }

              if (mergedLogs[key] === undefined) {
                mergedLogs[key] = remoteVal;
              } else {
                // Both have this key. Keep the latest click update based on UNIX timestamp!
                const localTime = mergedLogs[key].timestamp || 0;
                const remoteTime = remoteVal.timestamp || 0;
                
                if (remoteTime > localTime) {
                  mergedLogs[key] = remoteVal;
                }
              }
            });

            const finalMergedData = { 
              ownedCards: mergedCards, 
              loyaltyAwards: mergedAwards,
              logs: mergedLogs, 
              walletLastModified: finalWalletTime 
            };
            await uploadSyncFile(gdriveToken, fileId, finalMergedData);

            set({
              ownedCards: mergedCards,
              loyaltyAwards: mergedAwards,
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
              return { ...c, multipliers };
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
                signupBonusValue: defaultVal
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
                signupBonusValue: Math.max(0, value)
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
            isUsed: false,
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
              ? { ...a, isUsed: !a.isUsed, lastModified: Date.now() }
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
          syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
          return {
            loyaltyAwards: nextAwards,
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
            const val = nextLogs[key] as any;

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

      resetAll: () =>
        set(() => ({
          ownedCards: [],
          loyaltyAwards: [],
          logs: {},
          // Keep theme preference intact
        })),
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
