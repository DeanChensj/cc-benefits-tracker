import type { Benefit } from '../data/cards.db';

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
