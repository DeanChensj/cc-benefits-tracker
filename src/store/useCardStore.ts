import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS_DB, DEFAULT_VALUATIONS } from '../data/cards.db';
import { getDemoData } from '../data/demoData';
import type { Benefit, LoyaltyAward, PointCurrency } from '../data/cards.db';
import { translations } from '../utils/i18n';
import { findSyncFile, uploadSyncFile } from '../utils/gdrive';
import { syncPushToCloud, performGDriveSync } from '../utils/syncUtils';
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
  benefits?: Partial<Benefit>[]; // Cached benefits for extension matching
  annualFee?: number; // Annual fee of the card instance
  multipliers?: Record<string, number | undefined>;
  signupBonusActive?: boolean; // True if user secured the SUB!
  signupBonusValue?: number; // Valuation of the secured SUB
  pointCurrency?: PointCurrency; // Reward currency of the card instance (especially for custom cards)
  lastModified?: number; // Instance-level LWW timestamp
}

// Centralized function to create a new card instance with benefits mapped for extension
export function createCardInstance(templateId: string, currentCards: OwnedCardInstance[]): OwnedCardInstance | null {
  const template = CARDS_DB.find((c) => c.id === templateId);
  if (!template) return null;

  const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  const baseName = template.name;
  let newName = baseName;
  let count = 1;
  while (currentCards.some((c) => c.customName.toLowerCase().trim() === newName.toLowerCase().trim())) {
    newName = `${baseName} (${count})`;
    count++;
  }

  return {
    id: uniqueId,
    templateId,
    customName: newName,
    cardOpenDate: todayStr,
    annualFee: template.annualFee,
    instanceOffers: [],
    benefits: template.benefits.map(b => ({
      id: b.id,
      description: b.description,
      matchedDomains: b.matchedDomains
    })),
    lastModified: Date.now()
  };
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

interface RemoteSyncData {
  ownedCards?: OwnedCardInstance[];
  loyaltyAwards?: LoyaltyAward[];
  logs?: Record<string, import('../utils/logUtils').LogEntry>;
  deletedCardIds?: string[];
  deletedAwardIds?: string[];
  walletLastModified?: number;
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
  syncStatus: 'disconnected' | 'syncing' | 'synced' | 'error' | 'conflict';
  lastSyncedTime: string | null;
  customClientId: string | null; // Custom Google Client ID (persisted)
  lastSyncTimestamp: number; // Last successful sync timestamp
  pendingRemoteData: RemoteSyncData | null; // Pending remote data during conflict
  isGroupedView: boolean; // Group by card in checklist
  isDemoMode: boolean; // Flag for demo mode
  aiPrompt: string | null; // Prompt to trigger AI assistant

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
  setIsGroupedView: (isGrouped: boolean) => void;
  
  // Google Drive Actions
  setGDriveCredentials: (token: string | null, email: string | null) => void;
  setSyncStatus: (status: 'disconnected' | 'syncing' | 'synced' | 'error' | 'conflict') => void;
  syncWithGDrive: () => Promise<void>;
  setCustomClientId: (clientId: string | null) => void;
  resolveSyncConflict: (choice: 'local' | 'cloud') => Promise<void>;
  injectDemoData: () => void;
  setAiPrompt: (prompt: string | null) => void;

  // Instance Offer Actions
  addInstanceOffer: (instanceId: string, offer: Omit<Benefit, 'id'>) => void;
  updateWelcomeOffer: (instanceId: string, requirement: number, months: number, value: number) => void;
  removeInstanceOffer: (instanceId: string, offerId: string) => void;
  // Multiplier Customizer Actions
  updateCardMultipliers: (instanceId: string, multipliers: OwnedCardInstance['multipliers']) => void;
  updateCardPointCurrency: (instanceId: string, currency: PointCurrency) => void;

  // Standalone Loyalty Vouchers Actions
  addLoyaltyAward: (award: Omit<LoyaltyAward, 'id' | 'usedQuantity' | 'lastModified'>) => void;
  toggleLoyaltyAward: (awardId: string) => void;
  deleteLoyaltyAward: (awardId: string) => void;
  updateAwardUsedQuantity: (awardId: string, qty: number) => void;
  updateLoyaltyAward: (awardId: string, updates: Partial<LoyaltyAward>) => void;

  // Database Slimming Actions
  pruneExpiredLogs: (currentDate: Date) => void;

  resetAll: () => void;
  triggerSync: () => Promise<void>;
}



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
      lastSyncTimestamp: 0,
      pendingRemoteData: null,
      isGroupedView: false,
      isDemoMode: false,
      aiPrompt: null,

      addCard: (templateId) => {
        let generatedName = '';
        set((state) => {
          const currentCards = get().ownedCards;
          const newInstance = createCardInstance(templateId, currentCards);
          
          if (!newInstance) return state;
          
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
          const currentCards = get().ownedCards;
          const newInstances: OwnedCardInstance[] = [];
          
          for (const templateId of templateIds) {
            const newInstance = createCardInstance(templateId, [...currentCards, ...newInstances]);
            if (newInstance) {
              newInstances.push(newInstance);
            }
          }

          if (newInstances.length === 0) return state;

          const nextCards = [...state.ownedCards, ...newInstances];
          syncPushToCloud(state.gdriveToken, nextCards, state.logs);

          return {
            ownedCards: nextCards,
            walletLastModified: Date.now(),
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
            walletLastModified: Date.now(),
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
            walletLastModified: Date.now(),
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
            walletLastModified: Date.now(),
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

      setIsGroupedView: (isGrouped) =>
        set(() => ({
          isGroupedView: isGrouped,
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
        await performGDriveSync(get, set);
      },

      resolveSyncConflict: async (choice) => {
        const { gdriveToken, pendingRemoteData, ownedCards, loyaltyAwards, logs, deletedCardIds, deletedAwardIds } = get();
        if (!gdriveToken || !pendingRemoteData) return;

        set({ syncStatus: 'syncing' });
        try {
          const fileId = await findSyncFile(gdriveToken);
          
          if (choice === 'cloud') {
            // Overwrite with cloud data
            const remoteCards = pendingRemoteData.ownedCards || [];
            const remoteAwards = pendingRemoteData.loyaltyAwards || [];
            const remoteLogs = pendingRemoteData.logs || {};
            const remoteDeletedCards = pendingRemoteData.deletedCardIds || [];
            const remoteDeletedAwards = pendingRemoteData.deletedAwardIds || [];
            const remoteWalletTime = pendingRemoteData.walletLastModified || Date.now();

            set({
              ownedCards: remoteCards,
              loyaltyAwards: remoteAwards,
              logs: remoteLogs,
              deletedCardIds: remoteDeletedCards,
              deletedAwardIds: remoteDeletedAwards,
              walletLastModified: remoteWalletTime,
              lastSyncTimestamp: remoteWalletTime,
              syncStatus: 'synced',
              lastSyncedTime: new Date().toLocaleTimeString(),
              pendingRemoteData: null
            });
          } else {
            // Overwrite cloud with local data
            const dataToUpload = {
              ownedCards,
              loyaltyAwards,
              logs,
              deletedCardIds: deletedCardIds || [],
              deletedAwardIds: deletedAwardIds || [],
              walletLastModified: Date.now()
            };
            await uploadSyncFile(gdriveToken, fileId, dataToUpload);
            set({
              lastSyncTimestamp: dataToUpload.walletLastModified,
              syncStatus: 'synced',
              lastSyncedTime: new Date().toLocaleTimeString(),
              pendingRemoteData: null
            });
          }
        } catch (err) {
          set({ syncStatus: 'error' });
          throw err;
        }
      },

      setAiPrompt: (prompt) => set({ aiPrompt: prompt }),

      injectDemoData: () => {
        const language = get().language;
        const t = (key: keyof typeof translations['en']) => translations[language][key] || translations['en'][key];

        const { demoCards, demoAwards, demoLogs } = getDemoData(t);

        set({
          ownedCards: demoCards,
          loyaltyAwards: demoAwards,
          logs: demoLogs,
          isDemoMode: true,
          syncStatus: 'disconnected',
          lastSyncTimestamp: Date.now()
        });
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
          isDemoMode: false,
        })),
      triggerSync: async () => {
        const state = get();
        await syncPushToCloud(state.gdriveToken, state.ownedCards, state.logs);
      },

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
          isGroupedView: state.isGroupedView,
          isDemoMode: state.isDemoMode,
          customClientId: state.customClientId,
          gdriveEmail: state.gdriveEmail,
          syncStatus: state.syncStatus === 'synced' ? 'synced' : 'disconnected'
        };
      },
    }
  )
);

// Debounced subscriber to notify extension of data changes
let debounceTimer: number | null = null;
useCardStore.subscribe(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('perkfolio-sync'));
  }, 1000);
});
