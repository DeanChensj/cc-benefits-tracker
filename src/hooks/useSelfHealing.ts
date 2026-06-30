import { useEffect } from 'react';
import { useCardStore } from '../store/useCardStore';
import { loadGoogleGsiScript } from '../utils/gdrive';
import { CARDS_DB } from '../data/cards.db';

export function useSelfHealing(currentDate: Date) {
  useEffect(() => {
    const storeState = useCardStore.getState();

    // Self-Healing Migration: Restore missing benefits metadata on legacy cards
    const ownedCards = storeState.ownedCards || [];
    let healedAnyCard = false;
    const nextCards = ownedCards.map((card) => {
      if (card.templateId === 'custom') return card;

      const template = CARDS_DB.find((t) => t.id === card.templateId);
      if (!template) return card;

      const hasMissingBenefits = !card.benefits || card.benefits.length === 0;
      const hasMissingDomains = card.benefits?.some(b => b.matchedDomains === undefined);

      if (hasMissingBenefits || hasMissingDomains) {
        healedAnyCard = true;
        return {
          ...card,
          benefits: template.benefits.map(b => ({
            id: b.id,
            description: b.description,
            matchedDomains: b.matchedDomains
          })),
          lastModified: Date.now()
        };
      }
      return card;
    });

    if (healedAnyCard) {
      useCardStore.setState({ 
        ownedCards: nextCards,
        walletLastModified: Date.now()
      });
      console.log('🧹 [Self-Healing] Successfully migrated and populated missing benefits metadata on legacy card instances!');
      storeState.triggerSync();
    }
    const storedValuations = storeState.pointValuations;
    if (storedValuations) {
      if (storedValuations['chase-ur'] === 2.0 || storedValuations['chase-ur'] === 1.8) {
        storeState.updatePointValuation('chase-ur', 1.6);
      }
      if (storedValuations['amex-mr'] === 2.0 || storedValuations['amex-mr'] === 1.8) {
        storeState.updatePointValuation('amex-mr', 1.6);
      }
      if (storedValuations['hyatt'] === 2.1) {
        storeState.updatePointValuation('hyatt', 1.4);
      }
      
      // Dynamically populate missing new point currencies
      const newDefaults: Record<string, number> = {
        'hilton': 0.5,
        'aa-miles': 1.5,
        'ua-miles': 1.3,
        'delta-miles': 1.2,
        'bilt': 1.6
      };
      Object.entries(newDefaults).forEach(([currency, defVal]) => {
        if (storedValuations[currency] === undefined) {
          storeState.updatePointValuation(currency, defVal);
        }
      });
    }

    // Dynamically prune expired logs older than 2 years to maintain tiny capped DB footprint!
    storeState.pruneExpiredLogs(currentDate);

    loadGoogleGsiScript()
      .then(() => console.log('Google GIS client successfully pre-loaded.'))
      .catch((err) => console.error('Failed to load Google GIS Client library:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
