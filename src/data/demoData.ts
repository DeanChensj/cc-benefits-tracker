import type { OwnedCardInstance } from '../store/useCardStore';
import type { LoyaltyAward } from '../data/cards.db';
import type { LogEntry } from '../utils/logUtils';
import { obfuscateKey } from '../utils/cryptoUtils';
import { translations } from '../utils/i18n';

export const getDemoData = (t: (key: keyof typeof translations['en']) => string) => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const year = now.getFullYear();
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');

  const demoCards: OwnedCardInstance[] = [
    {
      id: 'demo_csr',
      templateId: 'chase-sapphire-reserve',
      customName: t('demoCsrName'),
      cardOpenDate: `${year}-04-01`,
      annualFee: 795,
      pointCurrency: 'chase-ur',
      instanceOffers: [
        {
          id: 'demo_csr_wo',
          name: 'Welcome Offer',
          description: 'Spend $4000 in 6 months',
          value: 900,
          resetPeriod: 'once',
          category: 'other',
          spendingLimit: 4000,
          expirationDate: `${year}-04-01`,
          type: 'welcome-offer'
        }
      ]
    },
    {
      id: 'demo_plat',
      templateId: 'amex-platinum',
      customName: t('demoPlatName'),
      cardOpenDate: todayStr,
      annualFee: 895,
      pointCurrency: 'amex-mr',
      instanceOffers: [
        {
          id: 'demo_plat_wo',
          name: 'Welcome Offer',
          description: 'Spend $4000 in 6 months',
          value: 3000,
          resetPeriod: 'once',
          category: 'other',
          spendingLimit: 4000,
          expirationDate: (() => {
            const d = new Date(todayStr);
            d.setMonth(d.getMonth() + 6);
            return d.toISOString().slice(0, 10);
          })(),
          type: 'welcome-offer'
        }
      ]
    }
  ];

  const demoAwards: LoyaltyAward[] = [
    {
      id: 'demo_award_1',
      templateId: 'hyatt-c4-fnr',
      customName: t('demoHyattName'),
      quantity: 1,
      usedQuantity: 0,
      expirationDate: `${year}-12-31`,
      lastModified: Date.now()
    },
    {
      id: 'demo_award_2',
      templateId: 'marriott-85k-fnr',
      customName: t('demoMarriottName'),
      quantity: 1,
      usedQuantity: 1,
      expirationDate: `${year}-06-30`,
      lastModified: Date.now()
    }
  ];

  const demoLogs: Record<string, LogEntry> = {};
  
  // 1. Complete CSR Welcome Offer
  demoLogs[obfuscateKey('once:demo_csr:demo_csr_wo')] = { 
    spentProgress: 4000, 
    timestamp: Date.now() - 60*24*3600*1000, 
    resolved: true, 
    value: 900 
  };

  // 2. Claim 2 more benefits for CSR
  const travelKey = `${year}:demo_csr:csr-travel`;
  demoLogs[obfuscateKey(travelKey)] = { spentProgress: 300, timestamp: Date.now(), resolved: true, value: 300 };

  const ddKey = `${year}-${monthStr}:demo_csr:csr-doordash`;
  demoLogs[obfuscateKey(ddKey)] = { spentProgress: 25, timestamp: Date.now(), resolved: true, value: 25 };

  // 3. Add some normal logs (Uber Cash)
  const uberKeyCurr = `${year}-${monthStr}:demo_plat:amex-plat-uber`;
  demoLogs[obfuscateKey(uberKeyCurr)] = { spentProgress: 15, timestamp: Date.now(), resolved: true, value: 15 };

  return { demoCards, demoAwards, demoLogs };
};
