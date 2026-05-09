import { AWARD_TEMPLATES } from '../data/cards.db';
import type { Benefit } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { ActiveBenefit } from './dateUtils';
import type { LogEntry } from './logUtils';
import { parseLogEntry } from './logUtils';
import { obfuscateKey } from './cryptoUtils';

export const getAnnualValue = (benefit: Benefit): number => {
  // Filter out spend-to-earn cashback multipliers (e.g. rate <= 10%)
  if (benefit.spendingLimit && (benefit.value / benefit.spendingLimit <= 0.1)) return 0;

  const val = benefit.value || 0;
  if (benefit.resetPeriod === 'monthly') return val * 12;
  if (benefit.resetPeriod === 'quarterly') return val * 4;
  if (benefit.resetPeriod === 'semi-annual') return val * 2;
  return val;
};

export const getCardPotentialValue = (benefits: Benefit[]): number => {
  return benefits.reduce((sum, b) => sum + getAnnualValue(b), 0);
};

export const getStepAmount = (limit: number): number => {
  if (limit <= 15) return limit; // e.g., $10 or $15 monthly credits
  if (limit <= 50) return 10;
  if (limit <= 250) return 50;
  return 100;
};

// Helper to calculate resolved value dynamically (supports progressive spends, binary logs, and standalone awards)
export const getResolvedValue = (ab: ActiveBenefit, logs: Record<string, LogEntry>): number => {
  if (ab.loyaltyAward) {
    const isCustom = ab.loyaltyAward.templateId === 'custom';
    const info = isCustom ? {
      value: ab.loyaltyAward.customValue || 0
    } : AWARD_TEMPLATES[ab.loyaltyAward.templateId];
    const usedQty = ab.loyaltyAward.usedQuantity || 0;
    return info.value * usedQty;
  }

  const logVal = logs[obfuscateKey(ab.logKey)];
  if (!logVal) return 0;
  
  const parsed = parseLogEntry(logVal);
  if (!parsed) return 0;

  if (ab.benefit.spendingLimit) {
    const spent = parsed.spentProgress || 0;
    const progressPercent = Math.min(spent / ab.benefit.spendingLimit, 1);
    return Math.round((ab.benefit.value * progressPercent) * 100) / 100;
  }
  
  return ab.benefit.value;
};

// Helper to calculate recouped value of a specific card instance
export const getCardRecoupedValue = (
  instanceId: string,
  ownedCards: OwnedCardInstance[],
  activeBenefits: ActiveBenefit[],
  logs: Record<string, LogEntry>
): number => {
  const instance = ownedCards.find((c) => c.id === instanceId);
  const subValue = (instance?.signupBonusActive && instance.signupBonusValue !== undefined) 
    ? instance.signupBonusValue 
    : 0;
  const cardBenefits = activeBenefits.filter((ab) => ab.cardInstance && ab.cardInstance.id === instanceId);
  const sum = cardBenefits.reduce((s, ab) => s + getResolvedValue(ab, logs), subValue);
  return Math.round(sum * 100) / 100;
};
