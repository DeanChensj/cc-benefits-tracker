import type { Benefit, LoyaltyAward } from '../data/cards.db';
import type { LogEntry } from './logUtils';
import { findSyncFile, uploadSyncFile } from './gdrive';
import type { OwnedCardInstance } from '../store/useCardStore';

// Helper to generate log key based on reset period and current date
export const getLogKey = (
  resetPeriod: 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed' | 'once',
  instanceId: string, // Unique instance ID
  benefitId: string,
  currentDate: Date,
  cardOpenDateStr?: string, // 'YYYY-MM-DD'
  expirationDateStr?: string // 'YYYY-MM-DD' for fixed benefits
): string => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  switch (resetPeriod) {
    case 'monthly': {
      const monthStr = month.toString().padStart(2, '0');
      return `${year}-${monthStr}:${instanceId}:${benefitId}`;
    }

    case 'quarterly': {
      const quarter = Math.ceil(month / 3); // Q1, Q2, Q3, Q4
      return `${year}-Q${quarter}:${instanceId}:${benefitId}`;
    }

    case 'semi-annual': {
      const half = month <= 6 ? 'H1' : 'H2';
      return `${year}-${half}:${instanceId}:${benefitId}`;
    }

    case 'annual-calendar':
      return `${year}:${instanceId}:${benefitId}`;

    case 'once':
      return `once:${instanceId}:${benefitId}`;

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

// Helper to create a Welcome Offer benefit
export const createWelcomeOffer = (
  openDateStr: string,
  requirement: number,
  months: number,
  value: number
): Benefit => {
  const openDate = new Date(openDateStr);
  openDate.setMonth(openDate.getMonth() + months);
  const expDateStr = openDate.toISOString().slice(0, 10);
  
  return {
    id: `offer_welcome_${Date.now()}`,
    name: 'Welcome Offer',
    description: `Spend $${requirement} in ${months} months`,
    value: value,
    resetPeriod: 'once',
    category: 'other',
    spendingLimit: requirement,
    expirationDate: expDateStr,
    type: 'welcome-offer'
  };
};

// Helper to extract year from a legacy plain key (supports: monthly, quarterly, semi-annual, annual, anniv, fixed)
export const getYearFromPlainKey = (plainKey: string): number | null => {
  const match = plainKey.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
};

// In-memory reference to the background sync debounce timer
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// Helper to push updates to Google Drive silently in the background with a 5-second debounce buffer
// Modified to accept all state as arguments to avoid circular dependency
export const syncPushToCloud = async (
  token: string | null,
  ownedCards: OwnedCardInstance[],
  logs: Record<string, LogEntry>,
  loyaltyAwards: LoyaltyAward[],
  deletedCardIds: string[],
  deletedAwardIds: string[]
) => {
  if (!token) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    try {
      const fileId = await findSyncFile(token);
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
