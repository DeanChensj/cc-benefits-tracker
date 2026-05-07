import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS_DB } from '../data/cards.db';

export interface OwnedCardInstance {
  id: string; // Unique instance ID (e.g. inst_171500000)
  templateId: string; // References the static CARDS_DB card id
  customName: string; // User's label (e.g. "Amex Gold - Player 2")
  anniversaryMonth: string; // '01'-'12'
}

export interface CardStore {
  ownedCards: OwnedCardInstance[];
  logs: Record<string, boolean>; // logKey -> isUsed

  // Actions
  addCard: (templateId: string) => void;
  removeCard: (instanceId: string) => void;
  renameCard: (instanceId: string, customName: string) => void;
  setAnniversaryMonth: (instanceId: string, month: string) => void;
  toggleBenefit: (logKey: string) => void;
  resetAll: () => void;
}

// Helper to generate log key based on reset period and current date
export const getLogKey = (
  resetPeriod: 'monthly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary',
  instanceId: string, // Unique instance ID instead of template ID
  benefitId: string,
  currentDate: Date,
  anniversaryMonthStr?: string // '01' to '12'
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
      const annMonth = parseInt(anniversaryMonthStr || '01', 10);
      // If current month is less than anniversary month, the period started in the previous calendar year
      const periodStartYear = month < annMonth ? year - 1 : year;
      return `${periodStartYear}-anniversary:${instanceId}:${benefitId}`;

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
          const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

          const newInstance: OwnedCardInstance = {
            id: uniqueId,
            templateId,
            customName: template.name,
            anniversaryMonth: currentMonth,
          };

          return {
            ownedCards: [...state.ownedCards, newInstance],
          };
        }),

      removeCard: (instanceId) =>
        set((state) => ({
          ownedCards: state.ownedCards.filter((c) => c.id !== instanceId),
          // Clean up logs associated with this instanceId to keep storage clean
          logs: Object.keys(state.logs).reduce((acc, key) => {
            const parts = key.split(':');
            // parts[1] is the instanceId (e.g., "period:instanceId:benefitId")
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

      setAnniversaryMonth: (instanceId, month) =>
        set((state) => ({
          ownedCards: state.ownedCards.map((c) =>
            c.id === instanceId ? { ...c, anniversaryMonth: month } : c
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
