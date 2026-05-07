import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Structure for tracking when a benefit was resolved
// Key: 
// - Monthly: `YYYY-MM:cardId:benefitId`
// - Semi-Annual: `YYYY-H1:cardId:benefitId` or `YYYY-H2:cardId:benefitId`
// - Annual-Calendar: `YYYY:cardId:benefitId`
// - Annual-Anniversary: `periodStartYear:cardId:benefitId`
export interface CardStore {
  ownedCardIds: string[];
  cardAnniversaries: Record<string, string>; // cardId -> 'MM' (anniversary month, e.g., '10' for October)
  logs: Record<string, boolean>; // logKey -> isUsed
  
  // Actions
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  setAnniversaryMonth: (cardId: string, month: string) => void;
  toggleBenefit: (logKey: string) => void;
  resetAll: () => void;
}

// Helper to generate log key based on reset period and current date
export const getLogKey = (
  resetPeriod: 'monthly' | 'annual-calendar' | 'annual-anniversary' | 'semi-annual',
  cardId: string,
  benefitId: string,
  currentDate: Date,
  anniversaryMonthStr?: string // '01' to '12'
): string => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  
  switch (resetPeriod) {
    case 'monthly':
      const monthStr = month.toString().padStart(2, '0');
      return `${year}-${monthStr}:${cardId}:${benefitId}`;
      
    case 'semi-annual':
      const half = month <= 6 ? 'H1' : 'H2';
      return `${year}-${half}:${cardId}:${benefitId}`;
      
    case 'annual-calendar':
      return `${year}:${cardId}:${benefitId}`;
      
    case 'annual-anniversary':
      const annMonth = parseInt(anniversaryMonthStr || '01', 10);
      // If current month is less than anniversary month, the period started in the previous calendar year
      const periodStartYear = month < annMonth ? year - 1 : year;
      return `${periodStartYear}-anniversary:${cardId}:${benefitId}`;
      
    default:
      return `${year}-${month}:${cardId}:${benefitId}`;
  }
};

export const useCardStore = create<CardStore>()(
  persist(
    (set) => ({
      ownedCardIds: [],
      cardAnniversaries: {},
      logs: {},

      addCard: (cardId) =>
        set((state) => {
          if (state.ownedCardIds.includes(cardId)) return state;
          const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
          return {
            ownedCardIds: [...state.ownedCardIds, cardId],
            cardAnniversaries: {
              ...state.cardAnniversaries,
              [cardId]: state.cardAnniversaries[cardId] || currentMonth,
            },
          };
        }),

      removeCard: (cardId) =>
        set((state) => ({
          ownedCardIds: state.ownedCardIds.filter((id) => id !== cardId),
          // Keep anniversary and logs just in case they re-add it
        })),

      setAnniversaryMonth: (cardId, month) =>
        set((state) => ({
          cardAnniversaries: {
            ...state.cardAnniversaries,
            [cardId]: month,
          },
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
          ownedCardIds: [],
          cardAnniversaries: {},
          logs: {},
        })),
    }),
    {
      name: 'cc-benefits-tracker-storage',
    }
  )
);
