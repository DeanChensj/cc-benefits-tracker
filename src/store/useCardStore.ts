import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS_DB } from '../data/cards.db';
import type { Benefit } from '../data/cards.db';

export interface OwnedCardInstance {
  id: string; // Unique instance ID (e.g. inst_171500000)
  templateId: string; // References the static CARDS_DB card id, or 'custom'
  customName: string; // User's label (e.g. "Amex Gold - Player 2")
  cardOpenDate: string; // Precise card opened date 'YYYY-MM-DD'
  bank?: string; // Custom bank name for custom cards
  color?: string; // Custom gradient classes for custom cards
  customBenefits?: Benefit[]; // Custom benefits for custom cards
}

export interface CardStore {
  ownedCards: OwnedCardInstance[];
  logs: Record<string, boolean>; // logKey -> isUsed

  // Actions
  addCard: (templateId: string) => void;
  addCustomCard: (card: Omit<OwnedCardInstance, 'id'>) => void;
  removeCard: (instanceId: string) => void;
  renameCard: (instanceId: string, customName: string) => void;
  setCardOpenDate: (instanceId: string, dateStr: string) => void;
  toggleBenefit: (logKey: string) => void;
  resetAll: () => void;
}

// Helper to generate log key based on reset period and current date
export const getLogKey = (
  resetPeriod: 'monthly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed',
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

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
      ownedCards: [],
      logs: {},

      addCard: (templateId) =>
        set((state) => {
          const template = CARDS_DB.find((c) => c.id === templateId);
          if (!template) return state;

          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const todayStr = new Date().toISOString().split('T')[0];

          const newInstance: OwnedCardInstance = {
            id: uniqueId,
            templateId,
            customName: template.name,
            cardOpenDate: todayStr,
          };

          return {
            ownedCards: [...state.ownedCards, newInstance],
          };
        }),

      addCustomCard: (customCard) =>
        set((state) => {
          const uniqueId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newInstance: OwnedCardInstance = {
            ...customCard,
            id: uniqueId,
          };
          return {
            ownedCards: [...state.ownedCards, newInstance],
          };
        }),

      removeCard: (instanceId) =>
        set((state) => ({
          ownedCards: state.ownedCards.filter((c) => c.id !== instanceId),
          logs: Object.keys(state.logs).reduce((acc, key) => {
            const parts = key.split(':');
            if (parts[1] !== instanceId) {
              acc[key] = state.logs[key];
            }
            return acc;
          }, {} as Record<string, boolean>),
        })),

      renameCard: (instanceId, customName) =>
        set((state) => ({
          ownedCards: state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, customName: customName.trim() || c.customName } : c
          ),
        })),

      setCardOpenDate: (instanceId, dateStr) =>
        set((state) => ({
          ownedCards: state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, cardOpenDate: dateStr } : c
          ),
        })),

      toggleBenefit: (logKey) =>
        set((state) => ({
          logs: {
            ...state.logs,
            [logKey]: !state.logs[logKey],
          },
        })),

      resetAll: () =>
        set(() => ({
          ownedCards: [],
          logs: {},
        })),
    }),
    {
      name: 'cc-benefits-tracker-storage',
    }
  )
);
