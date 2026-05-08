import type { OwnedCardInstance } from '../store/useCardStore';
import type { Benefit } from '../data/cards.db';

export interface ActiveBenefit {
  cardInstance: OwnedCardInstance;
  benefit: Benefit;
  logKey: string;
  isUsed: boolean;
}

export const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to compute days left relative to simulated/current date
export const getDaysLeft = (ab: ActiveBenefit, currentDate: Date): number | null => {
  const { benefit, cardInstance } = ab;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const todayMidnight = new Date(year, month, currentDate.getDate());

  if (benefit.resetPeriod === 'fixed' && benefit.expirationDate) {
    const expMidnight = new Date(benefit.expirationDate + 'T00:00:00');
    return Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  } else if (benefit.resetPeriod === 'monthly') {
    const lastDay = new Date(year, month + 1, 0);
    const expMidnight = new Date(year, month, lastDay.getDate());
    return Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  } else if (benefit.resetPeriod === 'quarterly') {
    const qEndMonth = Math.floor(month / 3) * 3 + 2;
    const lastDay = new Date(year, qEndMonth + 1, 0);
    const expMidnight = new Date(year, qEndMonth, lastDay.getDate());
    return Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  } else if (benefit.resetPeriod === 'semi-annual') {
    const saEndMonth = month <= 5 ? 5 : 11;
    const lastDay = saEndMonth === 5 ? 30 : 31;
    const expMidnight = new Date(year, saEndMonth, lastDay);
    return Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  } else if (benefit.resetPeriod === 'annual-calendar') {
    const expMidnight = new Date(year, 11, 31);
    return Math.round((expMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  } else if (benefit.resetPeriod === 'annual-anniversary' && cardInstance.cardOpenDate) {
    const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
    let nextAnniv = new Date(year, openDate.getMonth(), openDate.getDate());
    if (todayMidnight >= nextAnniv) {
      nextAnniv = new Date(year + 1, openDate.getMonth(), openDate.getDate());
    }
    return Math.round((nextAnniv.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null;
};

// Scientific urgency sorting score
export const getUrgencyScore = (ab: ActiveBenefit, currentDate: Date): number => {
  if (ab.isUsed) return 10000; // Checked is lowest priority
  
  const isExpired = ab.benefit.resetPeriod === 'fixed' && 
    ab.benefit.expirationDate && 
    new Date(ab.benefit.expirationDate + 'T00:00:00') < currentDate;
    
  if (isExpired) return 9000; // Expired is second lowest priority
  
  const daysLeft = getDaysLeft(ab, currentDate);
  if (daysLeft !== null) {
    if (ab.benefit.resetPeriod === 'fixed') {
      return daysLeft;
    } else if (ab.benefit.resetPeriod === 'monthly') {
      return daysLeft + 15;
    } else if (ab.benefit.resetPeriod === 'quarterly') {
      return daysLeft + 45;
    } else if (ab.benefit.resetPeriod === 'semi-annual') {
      return daysLeft + 90;
    } else {
      return daysLeft + 180;
    }
  }
  
  return 200; // Other cyclical benefits have standard priority
};

export interface AnnualFeeWarning {
  nextAnniversaryDate: Date;
  daysUntil: number;
  isWarningZone: boolean;
}

export const getAnnualFeeWarningInfo = (
  cardOpenDateStr: string,
  currentDate: Date
): AnnualFeeWarning => {
  const year = currentDate.getFullYear();
  const todayMidnight = new Date(year, currentDate.getMonth(), currentDate.getDate());
  const openDate = new Date(cardOpenDateStr + 'T00:00:00');

  // Calculate the anniversary in the current calendar year
  let nextAnniv = new Date(year, openDate.getMonth(), openDate.getDate());

  // If the anniversary this year has already passed, or is the opening day itself, schedule for next year
  if (todayMidnight > nextAnniv || nextAnniv.getTime() <= openDate.getTime()) {
    nextAnniv = new Date(year + 1, openDate.getMonth(), openDate.getDate());
  }

  const diffTime = nextAnniv.getTime() - todayMidnight.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Warning zone is within 30 days of the annual fee anniversary
  return {
    nextAnniversaryDate: nextAnniv,
    daysUntil,
    isWarningZone: daysUntil >= 0 && daysUntil <= 30
  };
};

const CIPHER_KEY = 42;

export const obfuscateKey = (key: string): string => {
  const scrambled = key.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ CIPHER_KEY)).join('');
  return btoa(unescape(encodeURIComponent(scrambled)));
};

export const deobfuscateKey = (obfuscated: string): string => {
  try {
    const scrambled = decodeURIComponent(escape(atob(obfuscated)));
    return scrambled.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ CIPHER_KEY)).join('');
  } catch (err) {
    return obfuscated;
  }
};

export interface LogEntry {
  resolved: boolean;
  timestamp: number; // UNIX epoch milliseconds
  value: number;
  spentProgress?: number;
  [key: string]: any; // Extensible signature for future features
}

export const parseLogEntry = (logValue: LogEntry | string | boolean | number | undefined | null): LogEntry | null => {
  if (logValue === undefined || logValue === null || logValue === false) return null;

  // Dynamic Self-Healing Fallback for legacy types
  if (typeof logValue === 'boolean') {
    return {
      resolved: true,
      timestamp: Date.now(),
      value: 0
    };
  }

  if (typeof logValue === 'number') {
    return {
      resolved: true,
      timestamp: Date.now(),
      value: 0,
      spentProgress: logValue
    };
  }

  if (typeof logValue === 'string') {
    const parts = logValue.split('|');
    const timestampSecs = parseInt(parts[0], 10) || 0;
    const savedValue = parseFloat(parts[1] || '0');
    const spentProgress = parts[2] !== undefined ? parseFloat(parts[2]) : undefined;
    return {
      resolved: true,
      timestamp: timestampSecs * 1000,
      value: savedValue,
      spentProgress
    };
  }

  return logValue;
};
