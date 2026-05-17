import { useMemo } from 'react';
import { useCardStore } from '../store/useCardStore';
import { CARDS_DB, CARD_MULTIPLIERS } from '../data/cards.db';

export interface WinnerCard {
  cardName: string;
  multiplier: number;
  ros: number;
  currency: string;
  bank: string;
}

export type CheckoutWinners = Record<string, WinnerCard | null>;

export function useCheckoutWinners() {
  const ownedCards = useCardStore((state) => state.ownedCards);
  const pointValuations = useCardStore((state) => state.pointValuations || {});

  return useMemo(() => {
    if (ownedCards.length === 0) return null;

    const categories = ['dining', 'travel', 'shopping', 'entertainment'] as const;
    const winners: CheckoutWinners = {
      dining: null,
      travel: null,
      shopping: null,
      entertainment: null
    };

    categories.forEach((cat) => {
      let maxRos = 0;
      let bestCard: WinnerCard | null = null;

      ownedCards.forEach((instance) => {
        let mult = 0;
        const template = CARDS_DB.find((t) => t.id === instance.templateId);
        const rotatingPerk = template?.benefits.find(b => b.category === 'rotating');

        // 1. Check if the card has active rotating categories for this quarter!
        if (rotatingPerk && rotatingPerk.activeCoreCategories && (rotatingPerk.activeCoreCategories as string[]).includes(cat)) {
          mult = 5; // Rotating categories are always 5%
        } else if (instance.multipliers?.[cat] !== undefined) {
          // 2. Check if the instance has manually customized overrides
          mult = instance.multipliers[cat]!;
        } else if (instance.templateId !== 'custom') {
          // 3. Fallback to static standard template multipliers
          mult = CARD_MULTIPLIERS[instance.templateId]?.[cat] || 0;
        }

        // 3. Resolve point type statically & calculate return (cpp)
        const currency = instance.pointCurrency || (template?.pointCurrency || 'cash');
        const cpp = pointValuations[currency] !== undefined ? pointValuations[currency] : 1.0;
        const ros = mult * cpp;

        // We track and recommend strictly by ROS% (Return on Spend)
        if (ros > maxRos) {
          maxRos = ros;
          bestCard = {
            cardName: instance.customName,
            multiplier: mult,
            ros,
            currency,
            bank: instance.bank || template?.bank || 'Card'
          };
        }
      });

      winners[cat] = bestCard;
    });

    // Check if we actually have at least one winner
    const hasWinner = Object.values(winners).some(w => w !== null);
    return hasWinner ? winners : null;
  }, [ownedCards, pointValuations]);
}
