import { useMemo } from 'react';
import { CARDS_DB, AWARD_TEMPLATES } from '../data/cards.db';
import type { CardTemplate, Benefit, LoyaltyAward } from '../data/cards.db';
import { getLogKey } from '../utils/storeHelpers';
import type { OwnedCardInstance } from '../store/useCardStore';
import { obfuscateKey } from '../utils/cryptoUtils';
import { parseLogEntry } from '../utils/logUtils';
import type { LogEntry } from '../utils/logUtils';

export interface ActiveBenefit {
  cardInstance?: OwnedCardInstance;
  template?: CardTemplate;
  benefit: Benefit;
  logKey: string;
  isUsed: boolean;
  loyaltyAward?: LoyaltyAward;
}

export function useActiveBenefits(
  ownedCards: OwnedCardInstance[],
  loyaltyAwards: LoyaltyAward[],
  logs: Record<string, LogEntry>,
  currentDate: Date
) {
  return useMemo(() => {
    const activeBenefits: ActiveBenefit[] = [];
    ownedCards.forEach((cardInstance) => {
      const template = CARDS_DB.find((t) => t.id === cardInstance.templateId);
      let benefits: Benefit[] = [];

      if (cardInstance.templateId === 'custom') {
        benefits = [...(cardInstance.customBenefits || [])];
      } else if (template) {
        benefits = [...template.benefits];
      }

      // Append card-instance specific custom offers (e.g., Amex Offers)
      if (cardInstance.instanceOffers && cardInstance.instanceOffers.length > 0) {
        benefits = [...benefits, ...cardInstance.instanceOffers];
      }

      benefits.forEach((benefit) => {
        const logKey = getLogKey(
          benefit.resetPeriod,
          cardInstance.id,
          benefit.id,
          currentDate,
          cardInstance.cardOpenDate,
          benefit.expirationDate
        );
        
        const obfuscatedKey = obfuscateKey(logKey);
        const logVal = logs[obfuscatedKey];
        const parsed = parseLogEntry(logVal);
        const isUsed = benefit.spendingLimit
          ? (parsed?.spentProgress || 0) >= benefit.spendingLimit
          : !!(parsed && parsed.resolved);

        // Dynamically compute precision date-level expiration for all reset periods timezone-safely!
        let resolvedExpirationDate = benefit.expirationDate;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-11

        if (benefit.resetPeriod === 'monthly') {
          const lastDay = new Date(year, month + 1, 0);
          resolvedExpirationDate = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
        } else if (benefit.resetPeriod === 'quarterly') {
          const qEndMonth = Math.floor(month / 3) * 3 + 2;
          const lastDay = new Date(year, qEndMonth + 1, 0);
          resolvedExpirationDate = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
        } else if (benefit.resetPeriod === 'semi-annual') {
          const saEndMonth = month <= 5 ? 6 : 12;
          const lastDay = new Date(year, saEndMonth, 0);
          resolvedExpirationDate = `${lastDay.getFullYear()}-${(lastDay.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;
        } else if (benefit.resetPeriod === 'annual-calendar') {
          resolvedExpirationDate = `${year}-12-31`;
        } else if (benefit.resetPeriod === 'annual-anniversary' && cardInstance.cardOpenDate) {
          const openDate = new Date(cardInstance.cardOpenDate + 'T00:00:00');
          const currentAnniv = new Date(year, openDate.getMonth(), openDate.getDate());
          
          const expirationDate = currentDate < currentAnniv 
            ? currentAnniv 
            : new Date(year + 1, openDate.getMonth(), openDate.getDate());
            
          resolvedExpirationDate = expirationDate.toISOString().split('T')[0];
        }

        activeBenefits.push({
          cardInstance,
          template,
          benefit: {
            ...benefit,
            expirationDate: resolvedExpirationDate
          },
          logKey,
          isUsed,
        });
      });
    });

    // Append active standalone loyalty awards into checklist benefits cleanly!
    loyaltyAwards.forEach((award) => {
      const isCustom = award.templateId === 'custom';
      const info = isCustom ? {
        name: award.customName || 'Custom Voucher',
        brand: award.customBrand || 'Other',
        programType: award.customProgramType || 'other',
        awardType: award.customAwardType || 'other',
        value: award.customValue || 0
      } : (AWARD_TEMPLATES[award.templateId] || {
        name: award.customName || 'Unknown Voucher',
        brand: 'Other',
        programType: 'other',
        awardType: 'other',
        value: 0
      });

      const usedQty = award.usedQuantity || 0;
      const isFullyUsed = usedQty >= award.quantity;

      // Synthesize standard Benefit object
      const synthesizedBenefit: Benefit = {
        id: award.id,
        name: info.name,
        description: award.notes || info.description || `${info.brand} loyalty reward certificate.`,
        value: info.value,
        resetPeriod: 'fixed',
        expirationDate: award.expirationDate,
        category: (info.awardType === 'fnr' || info.awardType === 'sua' || info.awardType === 'goh' || info.awardType === 'companion' || info.awardType === 'swu') 
          ? 'travel' 
          : info.awardType === 'points' ? 'shopping' : 'other'
      };

      activeBenefits.push({
        benefit: synthesizedBenefit,
        logKey: award.id,
        isUsed: isFullyUsed,
        loyaltyAward: award
      });
    });
    return activeBenefits;
  }, [ownedCards, loyaltyAwards, logs, currentDate]);
}
