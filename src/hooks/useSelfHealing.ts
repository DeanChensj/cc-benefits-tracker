import { useEffect } from 'react';
import { useCardStore } from '../store/useCardStore';
import { loadGoogleGsiScript } from '../utils/gdrive';

export function useSelfHealing(currentDate: Date) {
  useEffect(() => {
    // Self-Healing Migration: Automatically heal stored point valuations defaults
    const storeState = useCardStore.getState();
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
        'delta-miles': 1.2
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
