import { AWARD_TEMPLATES } from '../data/cards.db';
import type { Benefit, LoyaltyAward } from '../data/cards.db';
import type { OwnedCardInstance } from '../store/useCardStore';
import type { ActiveBenefit } from './dateUtils';
import type { LogEntry } from './logUtils';
import { parseLogEntry } from './logUtils';
import { obfuscateKey, deobfuscateKey } from './cryptoUtils';
import { CARDS_DB } from '../data/cards.db';

// Helper to parse benefit ID from a raw log key
export const getBenefitIdFromKey = (rawKey: string): string | null => {
  const parts = rawKey.split(':');
  if (parts.length === 1) return parts[0]; // Standalone Loyalty Award
  if (parts.length < 3) return null;
  if (parts[0] === 'anniv' && parts.length >= 5) return parts[4];
  return parts[2];
};

// Helper to build a fast lookup map for benefit values
export const getBenefitValueMap = (
  ownedCards: OwnedCardInstance[],
  loyaltyAwards: LoyaltyAward[]
): Map<string, number> => {
  const map = new Map<string, number>();
  
  ownedCards.forEach(c => {
    const template = CARDS_DB.find(t => t.id === c.templateId);
    if (template) {
      template.benefits.forEach(b => map.set(`${c.id}:${b.id}`, b.value));
    }
    c.instanceOffers?.forEach((b: Benefit) => map.set(`${c.id}:${b.id}`, b.value));
  });
  
  loyaltyAwards.forEach(a => {
    const isCustom = a.templateId === 'custom';
    const val = isCustom ? (a.customValue || 0) : (AWARD_TEMPLATES[a.templateId]?.value || 0);
    map.set(a.id, val);
  });
  return map;
};
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

// Parse date represented by the raw key cycle string
export const getLogEntryDate = (cycle: string, resetPeriod: string): Date => {
  try {
    if (resetPeriod === 'monthly') {
      const [y, m] = cycle.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, 15);
    }
    if (resetPeriod === 'quarterly') {
      const [y, q] = cycle.split('-Q');
      const month = (parseInt(q) - 1) * 3 + 1;
      return new Date(parseInt(y), month, 15);
    }
    if (resetPeriod === 'semi-annual') {
      const [y, half] = cycle.split('-');
      const month = half === 'H1' ? 2 : 8;
      return new Date(parseInt(y), month, 15);
    }
    if (resetPeriod === 'annual-calendar') {
      return new Date(parseInt(cycle), 5, 15);
    }
    if (resetPeriod === 'annual-anniversary') {
      const startStr = cycle.split('_to_')[0];
      return new Date(startStr + 'T12:00:00');
    }
    if (resetPeriod === 'fixed') {
      return new Date(cycle + 'T12:00:00');
    }
  } catch {
    // fallback
  }
  return new Date();
};

// Helper to calculate resolved value dynamically (supports progressive spends, binary logs, and standalone awards)
export const getResolvedValue = (ab: ActiveBenefit, logs: Record<string, LogEntry>): number => {
  if (ab.loyaltyAward) {
    const isCustom = ab.loyaltyAward.templateId === 'custom';
    const info = isCustom ? {
      value: ab.loyaltyAward.customValue || 0
    } : (AWARD_TEMPLATES[ab.loyaltyAward.templateId] || { value: 0 });
    const usedQty = ab.loyaltyAward.usedQuantity || 0;
    return info.value * usedQty;
  }

  const logVal = logs[obfuscateKey(ab.logKey)];
  if (!logVal) return 0;
  
  const parsed = parseLogEntry(logVal);
  if (!parsed) return 0;

  if (ab.benefit.spendingLimit) {
    const spent = parsed.spentProgress || 0;
    if (ab.benefit.type === 'welcome-offer') {
      return spent >= ab.benefit.spendingLimit ? ab.benefit.value : 0;
    }
    const progressPercent = Math.min(spent / ab.benefit.spendingLimit, 1);
    return Math.round((ab.benefit.value * progressPercent) * 100) / 100;
  }
  if (parsed.resolved) {
    return ab.benefit.value;
  }
  
  return 0;
};

// Helper to calculate recouped value of a specific card instance across historical cycles
export const getCardRecoupedValue = (
  instanceId: string,
  ownedCards: OwnedCardInstance[],
  logs: Record<string, LogEntry>,
  currentDate = new Date()
): number => {
  const instance = ownedCards.find((c) => c.id === instanceId);
  if (!instance) return 0;

  const template = CARDS_DB.find((t) => t.id === instance.templateId);
  const benefits: Benefit[] = instance.templateId === 'custom'
    ? (instance.customBenefits || [])
    : (template?.benefits || []);

  // Append card-instance specific custom offers
  const offers = instance.instanceOffers || [];
  const allBenefits = [...benefits, ...offers];



  // Compute card anniversary boundaries based on simulated/current date
  const year = currentDate.getFullYear();
  const openDate = new Date((instance.cardOpenDate || '2026-01-01') + 'T00:00:00');
  const todayMidnight = new Date(year, currentDate.getMonth(), currentDate.getDate());
  const currentAnniv = new Date(year, openDate.getMonth(), openDate.getDate());

  const start = todayMidnight < currentAnniv 
    ? new Date(year - 1, openDate.getMonth(), openDate.getDate())
    : currentAnniv;
  const end = todayMidnight < currentAnniv 
    ? currentAnniv 
    : new Date(year + 1, openDate.getMonth(), openDate.getDate());

  let sum = 0;

  // Audit all historical log entries in sandbox store
  Object.keys(logs).forEach((obfuscatedKey) => {
    const rawKey = deobfuscateKey(obfuscatedKey);
    const parts = rawKey.split(':');
    if (parts.length < 3) return;

    const cycle = parts[0];
    const logInstanceId = parts[1];
    const logBenefitId = getBenefitIdFromKey(rawKey);
    if (!logBenefitId) return;

    if (logInstanceId !== instanceId) return;

    // Find matching benefit metadata
    const benefit = allBenefits.find((b) => b.id === logBenefitId);
    if (!benefit) return;

    // Check if the log entry falls within the current anniversary year boundaries
    const entryDate = getLogEntryDate(cycle, benefit.resetPeriod);
    if (entryDate < start || entryDate >= end) return;

    const logVal = logs[obfuscatedKey];
    if (!logVal) return;
    const parsed = parseLogEntry(logVal);
    if (!parsed) return;

    if (benefit.spendingLimit) {
      const spent = parsed.spentProgress || 0;
      if (benefit.type === 'welcome-offer') {
        if (spent >= benefit.spendingLimit) {
          sum += benefit.value;
        }
      } else {
        const progressPercent = Math.min(spent / benefit.spendingLimit, 1);
        sum += benefit.value * progressPercent;
      }
    } else if (parsed.resolved) {
      sum += benefit.value;
    }
  });

  return Math.round(sum * 100) / 100;
};

export const getSavingsForPeriod = (
  logs: Record<string, LogEntry>,
  period: 'today' | 'month',
  currentDate: Date,
  ownedCards: OwnedCardInstance[],
  loyaltyAwards: LoyaltyAward[]
): number => {
  let sum = 0;
  
  const getLocalDateStr = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };
  
  const todayStr = getLocalDateStr(currentDate);
  const monthStr = todayStr.slice(0, 7); // YYYY-MM

  // Build benefit value map
  const benefitValueMap = getBenefitValueMap(ownedCards, loyaltyAwards);

  Object.keys(logs).forEach((obfuscatedKey) => {
    const rawKey = deobfuscateKey(obfuscatedKey);
    const benefitId = getBenefitIdFromKey(rawKey);
    if (!benefitId) return;
    const logVal = logs[obfuscatedKey];
    if (!logVal) return;

    // Parse log
    const parsed = parseLogEntry(logVal);
    if (!parsed) return;

    if (!parsed.resolved || !parsed.timestamp) return;

    const logDate = getLocalDateStr(new Date(parsed.timestamp));
    
    if (period === 'today') {
      if (logDate !== todayStr) return;
    } else if (period === 'month') {
      if (!logDate.startsWith(monthStr)) return;
    }

    const parts = rawKey.split(':');
    const valKey = parts.length === 1 ? benefitId : `${parts[1]}:${benefitId}`;
    const val = benefitValueMap.get(valKey) || 0;
    sum += val;
  });

  return Math.round(sum * 100) / 100;
};
