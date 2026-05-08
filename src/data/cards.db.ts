export interface Benefit {
  id: string;
  name: string;
  description: string;
  value: number;
  resetPeriod: 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed';
  category: 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other';
  expirationDate?: string; // e.g., '2026-12-31' (only for 'fixed' resetPeriod)
  spendingLimit?: number; // e.g., 1500 for CFF 5%, 6000 for BCP 6% (only for progressive limit perks)
}

export interface CardTemplate {
  id: string;
  name: string;
  bank: 'Amex' | 'Chase' | 'Citi' | 'Other';
  color: string; // Tailwind gradient classes
  annualFee: number; // USD Annual Fee of the card
  benefits: Benefit[];
  officialUrl?: string; // Official card application / detail landing page URL
  signupBonusValue?: number; // Pre-populated signup bonus value in USD
}

export const CARDS_DB: CardTemplate[] = [
  {
    id: 'amex-gold',
    name: 'American Express Gold',
    bank: 'Amex',
    color: 'from-[#c5a059] via-[#fdf2d5] to-[#9c7a3c]',
    annualFee: 320,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
    signupBonusValue: 800,
    benefits: [
      {
        id: 'amex-gold-uber',
        name: 'Uber Cash',
        description: '$10/month for Uber rides or Uber Eats',
        value: 10,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'amex-gold-dining',
        name: 'Dining Credit',
        description: '$10/month at Grubhub, Cheesecake Factory, etc.',
        value: 10,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'amex-gold-resy',
        name: 'Resy Credit',
        description: '$50 semi-annually (Jan-Jun, Jul-Dec) statement credit for Resy bookings',
        value: 50,
        resetPeriod: 'semi-annual',
        category: 'dining'
      },
      {
        id: 'amex-gold-dunkin',
        name: 'Dunkin Credit',
        description: '$7/month statement credit at U.S. Dunkin locations',
        value: 7,
        resetPeriod: 'monthly',
        category: 'dining'
      }
    ]
  },
  {
    id: 'amex-platinum',
    name: 'American Express Platinum',
    bank: 'Amex',
    color: 'from-slate-400 via-slate-200 to-slate-600',
    annualFee: 895,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
    signupBonusValue: 1250,
    benefits: [
      {
        id: 'amex-plat-uber',
        name: 'Uber Cash',
        description: '$15/month ($35 in Dec) for Uber or Uber Eats purchases',
        value: 15,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'amex-plat-entertainment',
        name: 'Digital Entertainment',
        description: '$25/month statement credit for YouTube Premium, Disney Bundle, Hulu, etc.',
        value: 25,
        resetPeriod: 'monthly',
        category: 'entertainment'
      },
      {
        id: 'amex-plat-airline',
        name: 'Airline Fee Credit',
        description: '$200/calendar year statement credit for airline baggage & lounge incidentals',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'amex-plat-hotel',
        name: 'FHR Hotel Credit',
        description: '$300 statement credit twice a year for prepaid Fine Hotels & Resorts bookings',
        value: 300,
        resetPeriod: 'semi-annual',
        category: 'travel'
      },
      {
        id: 'amex-plat-walmart',
        name: 'Walmart+ Membership',
        description: '$12.95/month statement credit to fully cover Walmart+ monthly membership',
        value: 13,
        resetPeriod: 'monthly',
        category: 'shopping'
      },
      {
        id: 'amex-plat-clear',
        name: 'CLEAR Plus Credit',
        description: '$209/calendar year statement credit to fully cover CLEAR Plus security membership',
        value: 209,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'amex-plat-lululemon',
        name: 'Lululemon Credit',
        description: '$75 quarterly statement credit at Lululemon stores or online',
        value: 75,
        resetPeriod: 'quarterly',
        category: 'shopping'
      },
      {
        id: 'amex-plat-resy-plat',
        name: 'Resy Restaurant Credit',
        description: '$100 quarterly statement credit for dining at Resy restaurants',
        value: 100,
        resetPeriod: 'quarterly',
        category: 'dining'
      },
      {
        id: 'amex-plat-uber-one',
        name: 'Uber One Credit',
        description: '$120/calendar year statement credit to fully cover Uber One subscription',
        value: 120,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      }
    ]
  },
  {
    id: 'amex-bcp',
    name: 'Amex Blue Cash Preferred',
    bank: 'Amex',
    color: 'from-cyan-600 via-blue-800 to-slate-900',
    annualFee: 95,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/',
    benefits: [
      {
        id: 'bcp-groceries',
        name: 'Supermarket 6%',
        description: '6% cash back on U.S. supermarkets on up to $6,000 spend per year',
        value: 360, // $6000 * 6%
        resetPeriod: 'annual-calendar',
        category: 'shopping',
        spendingLimit: 6000
      },
      {
        id: 'bcp-disney',
        name: 'Disney Bundle Credit',
        description: '$7/month statement credit for Disney Bundle ($84/yr)',
        value: 7,
        resetPeriod: 'monthly',
        category: 'entertainment'
      },
      {
        id: 'bcp-equinox',
        name: 'Equinox Credit',
        description: '$10/month statement credit for Equinox+',
        value: 10,
        resetPeriod: 'monthly',
        category: 'entertainment'
      }
    ]
  },
  {
    id: 'amex-delta-reserve',
    name: 'Amex Delta SkyMiles Reserve',
    bank: 'Amex',
    color: 'from-blue-950 via-indigo-900 to-slate-950',
    annualFee: 650,
    benefits: [
      {
        id: 'delta-reserve-companion',
        name: 'First Class Companion Certificate',
        description: 'Annual First Class, Delta Comfort+, or Main Cabin roundtrip companion certificate',
        value: 450,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      },
      {
        id: 'delta-reserve-stays',
        name: 'Delta Stays Credit',
        description: 'Up to $200/calendar year credit for prepaid Delta Stays hotel bookings',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'delta-reserve-resy',
        name: 'Resy Credit',
        description: 'Up to $240/year ($20 monthly statement credit) for Resy dining bookings',
        value: 20,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'delta-reserve-rideshare',
        name: 'Rideshare Credit',
        description: 'Up to $120/year ($10 monthly statement credit) for U.S. rideshare services',
        value: 10,
        resetPeriod: 'monthly',
        category: 'travel'
      }
    ]
  },
  {
    id: 'amex-biz-platinum',
    name: 'Amex Business Platinum',
    bank: 'Amex',
    color: 'from-zinc-400 via-zinc-200 to-zinc-600',
    annualFee: 695,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/american-express-business-platinum-credit-card-amex/',
    signupBonusValue: 1500,
    benefits: [
      {
        id: 'biz-plat-dell',
        name: 'Dell Credit',
        description: '$200 statement credit semi-annually (Jan-Jun, Jul-Dec)',
        value: 200,
        resetPeriod: 'semi-annual',
        category: 'shopping'
      },
      {
        id: 'biz-plat-wireless',
        name: 'Wireless Credit',
        description: '$10/month statement credit for U.S. statement credit wireless',
        value: 10,
        resetPeriod: 'monthly',
        category: 'other'
      },
      {
        id: 'biz-plat-airline',
        name: 'Airline Fee Credit',
        description: '$200/calendar year airline incidental credit',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      }
    ]
  },
  {
    id: 'amex-hilton-aspire',
    name: 'Amex Hilton Aspire',
    bank: 'Amex',
    color: 'from-indigo-900 via-violet-950 to-slate-950',
    annualFee: 550,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/hilton-honors-aspire/',
    benefits: [
      {
        id: 'aspire-resort',
        name: 'Hilton Resort Credit',
        description: '$200 resort credit semi-annually (Jan-Jun, Jul-Dec)',
        value: 200,
        resetPeriod: 'semi-annual',
        category: 'travel'
      },
      {
        id: 'aspire-fnr',
        name: 'Free Night Reward',
        description: 'Annual Hilton Free Night Reward certificate after anniversary',
        value: 250,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      },
      {
        id: 'aspire-flight',
        name: 'Flight Credit',
        description: 'Up to $200/year ($50 quarterly statement credit) for flight purchases made directly with airlines or amextravel.com',
        value: 50,
        resetPeriod: 'quarterly',
        category: 'travel'
      }
    ]
  },
  {
    id: 'amex-delta-platinum',
    name: 'Amex Delta SkyMiles Platinum',
    bank: 'Amex',
    color: 'from-blue-950 via-slate-900 to-red-950',
    annualFee: 350,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-platinum-american-express-card/',
    benefits: [
      {
        id: 'delta-plat-companion',
        name: 'Companion Certificate',
        description: 'Annual domestic Main Cabin roundtrip companion certificate',
        value: 300,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      },
      {
        id: 'delta-plat-stays',
        name: 'Delta Stays Credit',
        description: 'Up to $150/calendar year credit for prepaid Delta Stays hotel bookings',
        value: 150,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'delta-plat-resy',
        name: 'Resy Credit',
        description: 'Up to $120/year ($10 monthly statement credit) for Resy dining bookings',
        value: 10,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'delta-plat-rideshare',
        name: 'Rideshare Credit',
        description: 'Up to $120/year ($10 monthly statement credit) for U.S. rideshare services',
        value: 10,
        resetPeriod: 'monthly',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-sapphire-reserve',
    name: 'Chase Sapphire Reserve',
    bank: 'Chase',
    color: 'from-blue-700 to-indigo-900',
    annualFee: 795,
    officialUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
    signupBonusValue: 900,
    benefits: [
      {
        id: 'csr-travel',
        name: 'Travel Credit',
        description: '$300 annual travel statement credit for flights, hotels, transit, and tolls',
        value: 300,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      },
      {
        id: 'csr-stubhub',
        name: 'StubHub Credit',
        description: '$150 semi-annual statement credit for concert and sports tickets on StubHub',
        value: 150,
        resetPeriod: 'semi-annual',
        category: 'entertainment'
      },
      {
        id: 'csr-doordash',
        name: 'DoorDash Credit',
        description: '$25 monthly credit ($10 non-restaurant + $15 restaurant)',
        value: 25,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'csr-lyft',
        name: 'Lyft Credit',
        description: '$10 U.S. rideshare monthly statement credit',
        value: 10,
        resetPeriod: 'monthly',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-sapphire-preferred',
    name: 'Chase Sapphire Preferred',
    bank: 'Chase',
    color: 'from-blue-850 via-blue-950 to-slate-950',
    annualFee: 95,
    officialUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
    signupBonusValue: 750,
    benefits: [
      {
        id: 'csp-hotel',
        name: 'Hotel Credit',
        description: '$50 annual credit for hotel stays booked through Chase Travel',
        value: 50,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-freedom-flex',
    name: 'Chase Freedom Flex',
    bank: 'Chase',
    color: 'from-sky-900 via-indigo-950 to-black',
    annualFee: 0,
    officialUrl: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/flex',
    benefits: [
      {
        id: 'cff-rotating',
        name: '5% Rotating Category',
        description: '5% cash back on rotating quarterly categories on up to $1,500 spend per quarter',
        value: 75, // $1500 * 5%
        resetPeriod: 'quarterly',
        category: 'dining',
        spendingLimit: 1500
      },

    ]
  },

  {
    id: 'chase-hyatt',
    name: 'Chase World of Hyatt',
    bank: 'Chase',
    color: 'from-blue-600 via-sky-850 to-slate-950',
    annualFee: 95,
    officialUrl: 'https://creditcards.chase.com/travel-credit-cards/world-of-hyatt-credit-card',
    benefits: [
      {
        id: 'hyatt-fnr',
        name: 'Annual Free Night (Cat 1-4)',
        description: 'Anniversary Free Night Certificate valid at Category 1-4 Hyatt hotels',
        value: 150,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-marriott-boundless',
    name: 'Chase Marriott Bonvoy Boundless',
    bank: 'Chase',
    color: 'from-slate-900 via-indigo-950 to-black',
    annualFee: 95,
    officialUrl: 'https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/boundless',
    benefits: [
      {
        id: 'marriott-fnr',
        name: 'Annual Free Night (35K)',
        description: 'Anniversary Free Night Certificate valid for stays up to 35,000 points',
        value: 200,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-ihg-premier',
    name: 'Chase IHG One Rewards Premier',
    bank: 'Chase',
    color: 'from-amber-900 via-neutral-950 to-neutral-950',
    annualFee: 95,
    officialUrl: 'https://creditcards.chase.com/travel-credit-cards/ihg-rewards-club/premier',
    benefits: [
      {
        id: 'ihg-fnr',
        name: 'Anniversary Free Night (40K)',
        description: 'Anniversary Free Night Certificate valid for stays up to 40,000 points',
        value: 150,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      },
      {
        id: 'ihg-united',
        name: 'United TravelCash',
        description: '$50/calendar year United TravelBank Cash credit ($25 semi-annually)',
        value: 50,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      }
    ]
  },
  {
    id: 'capital-one-venture-x',
    name: 'Capital One Venture X',
    bank: 'Other',
    color: 'from-teal-600 to-emerald-800',
    annualFee: 395,
    officialUrl: 'https://www.capitalone.com/credit-cards/venture-x/',
    signupBonusValue: 750,
    benefits: [
      {
        id: 'vx-travel',
        name: 'Travel Credit',
        description: '$300/year credit for Capital One Travel portal bookings',
        value: 300,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  },
  {
    id: 'discover-it-cashback',
    name: 'Discover it Cash Back',
    bank: 'Other',
    color: 'from-orange-500 via-red-500 to-orange-600',
    annualFee: 0,
    officialUrl: 'https://www.discover.com/credit-cards/cashback/',
    benefits: [
      {
        id: 'discover-it-rotating',
        name: '5% Rotating Category',
        description: '5% cash back on rotating quarterly categories on up to $1,500 spend per quarter',
        value: 75,
        resetPeriod: 'quarterly',
        category: 'shopping',
        spendingLimit: 1500
      }
    ]
  },
  {
    id: 'amex-marriott-brilliant',
    name: 'Amex Marriott Bonvoy Brilliant',
    bank: 'Amex',
    color: 'from-neutral-900 via-stone-950 to-stone-900',
    annualFee: 650,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-brilliant/',
    benefits: [
      {
        id: 'marriott-brilliant-dining',
        name: '$300 Dining Credit',
        description: 'Get up to $25 back per month in statement credits for global restaurant purchases.',
        value: 300,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'marriott-brilliant-fnr',
        name: 'Anniversary Free Night (85K)',
        description: '1 Free Night Award every year after card anniversary, valid up to 85,000 Marriott points.',
        value: 450,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  },
  {
    id: 'citi-custom-cash',
    name: 'Citi Custom Cash',
    bank: 'Citi',
    color: 'from-blue-600 to-blue-900',
    annualFee: 0,
    officialUrl: 'https://www.citi.com/credit-cards/citi-custom-cash-credit-card',
    benefits: [
      {
        id: 'citi-custom-5percent',
        name: '5% Cashback on Top Category',
        description: '5% cash back on your highest eligible spend category each billing cycle, up to $500 spent ($25/mo cash back).',
        value: 300,
        resetPeriod: 'monthly',
        category: 'shopping',
        spendingLimit: 500
      }
    ]
  },
  {
    id: 'amex-biz-gold',
    name: 'Amex Business Gold',
    bank: 'Amex',
    color: 'from-amber-600 via-amber-700 to-amber-900',
    annualFee: 375,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/american-express-business-gold-card-amex/',
    benefits: [
      {
        id: 'biz-gold-office-transit',
        name: '$240 Office Supply & Transit',
        description: 'Get up to $20 back per month in statement credits for U.S. office supply store or transit purchases.',
        value: 240,
        resetPeriod: 'monthly',
        category: 'shopping'
      }
    ]
  },
  {
    id: 'chase-ink-cash',
    name: 'Chase Ink Business Cash',
    bank: 'Chase',
    color: 'from-slate-700 via-slate-800 to-slate-900',
    annualFee: 0,
    officialUrl: 'https://creditcards.chase.com/business-credit-cards/ink/cash',
    benefits: [
      {
        id: 'ink-cash-5percent',
        name: '5% Office Supply & Telecom',
        description: '5% cash back on the first $25,000 spent in combined purchases at office supply stores and on internet/phone services each card anniversary year.',
        value: 1250,
        resetPeriod: 'annual-anniversary',
        category: 'shopping',
        spendingLimit: 25000
      }
    ]
  },
  {
    id: 'chase-freedom-unlimited',
    name: 'Chase Freedom Unlimited',
    bank: 'Chase',
    color: 'from-blue-500 to-indigo-700',
    annualFee: 0,
    officialUrl: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited',
    benefits: []
  },
  {
    id: 'amex-bce',
    name: 'Amex Blue Cash Everyday',
    bank: 'Amex',
    color: 'from-sky-600 via-sky-700 to-blue-800',
    annualFee: 0,
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/',
    benefits: [
      {
        id: 'bce-disney',
        name: '$84 Disney Bundle Credit',
        description: 'Get a $7 monthly statement credit after spending $9.99 or more on Disney Bundle subscriptions.',
        value: 84,
        resetPeriod: 'monthly',
        category: 'shopping'
      },
      {
        id: 'bce-homechef',
        name: '$180 Home Chef Credit',
        description: 'Get up to $15 back per month in statement credits for Home Chef meal kit purchases.',
        value: 180,
        resetPeriod: 'monthly',
        category: 'dining'
      }
    ]
  },
  {
    id: 'citi-premier',
    name: 'Citi Premier',
    bank: 'Citi',
    color: 'from-cyan-600 to-blue-800',
    annualFee: 95,
    officialUrl: 'https://www.citi.com/credit-cards/citi-strata-premier-credit-card',
    benefits: [
      {
        id: 'strata-premier-hotel',
        name: '$100 Annual Hotel Benefit',
        description: '$100 off a single hotel stay of $500 or more (excluding taxes/fees) booked through CitiTravel.com each calendar year.',
        value: 100,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      }
    ]
  },
  {
    id: 'citi-aa-platinum-select',
    name: 'Citi AAdvantage Platinum Select',
    bank: 'Citi',
    color: 'from-slate-500 via-slate-600 to-zinc-700',
    annualFee: 99,
    officialUrl: 'https://www.citi.com/credit-cards/citi-aadvantage-platinum-select-credit-card',
    benefits: [
      {
        id: 'citi-aa-flight-discount',
        name: '$125 Flight Discount',
        description: 'Earn a $125 American Airlines Flight Discount after spending $20,000 or more during your cardmembership year.',
        value: 125,
        resetPeriod: 'annual-anniversary',
        category: 'travel',
        spendingLimit: 20000
      }
    ]
  }
];

export const CARD_MULTIPLIERS: Record<string, { dining?: number; travel?: number; shopping?: number; entertainment?: number }> = {
  'amex-gold': { dining: 4, shopping: 4 }, // 4x Dining, 4x Groceries
  'amex-platinum': { travel: 5 }, // 5x Flights
  'amex-bcp': { shopping: 6, entertainment: 6 }, // 6% Groceries, 6% Streaming
  'amex-delta-reserve': { travel: 3 }, // 3x Delta
  'amex-delta-platinum': { travel: 3 }, // 3x Delta
  'amex-biz-platinum': { travel: 5 }, // 5x Flights
  'amex-hilton-aspire': { travel: 7, dining: 7 }, // 14x Hilton, 7x Flights/Dining
  'chase-sapphire-reserve': { travel: 3, dining: 3 }, // 3x Travel, 3x Dining
  'chase-sapphire-preferred': { dining: 3, travel: 2, entertainment: 3 }, // 3x Dining, 3x Streaming, 2x Travel
  'chase-freedom-flex': { dining: 3, shopping: 5 }, // 3x Dining, 5x Rotating
  'chase-hyatt': { travel: 4, dining: 2 }, // 4x Hyatt, 2x Dining
  'chase-marriott-boundless': { travel: 6, dining: 2 }, // 6x Marriott, 2x Dining
  'chase-ihg-premier': { travel: 10, dining: 5 }, // 10x IHG, 5x Dining
  'capitalone-venture-x': { travel: 2, dining: 2, shopping: 2, entertainment: 2 }, // 2x everything
  'amex-marriott-brilliant': { travel: 6, dining: 3 }, // 6x Marriott, 3x Dining
  'citi-custom-cash': { shopping: 5 }, // 5x top category
  'amex-biz-gold': { travel: 4, shopping: 4 }, // 4x transit/office
  'chase-ink-cash': { shopping: 5 }, // 5x office/telecom
  'chase-freedom-unlimited': { dining: 3, travel: 1.5, shopping: 1.5 }, // 3x dining, 1.5x flat
  'amex-bce': { shopping: 3 }, // 3x groceries/online
  'citi-premier': { travel: 3, dining: 3, shopping: 3 }, // 3x travel/dining/supermarket
  'citi-aa-platinum-select': { travel: 2, dining: 2, shopping: 2 } // 2x AA Flights/Dining/Gas Stations
};
