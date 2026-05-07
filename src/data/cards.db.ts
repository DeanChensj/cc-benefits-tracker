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
  bank: 'Amex' | 'Chase' | 'Capital One' | 'Other';
  color: string; // Tailwind gradient classes
  annualFee: number; // USD Annual Fee of the card
  benefits: Benefit[];
}

export const CARDS_DB: CardTemplate[] = [
  {
    id: 'amex-gold',
    name: 'American Express Gold',
    bank: 'Amex',
    color: 'from-amber-500 to-yellow-600',
    annualFee: 320,
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
    color: 'from-slate-600 via-slate-700 to-slate-900',
    annualFee: 695,
    benefits: [
      {
        id: 'amex-plat-uber',
        name: 'Uber Cash',
        description: '$15/month ($35 in Dec) for Uber or Uber Eats',
        value: 15,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'amex-plat-entertainment',
        name: 'Digital Entertainment',
        description: '$20/month for Disney+, Peacock, NY Times, etc.',
        value: 20,
        resetPeriod: 'monthly',
        category: 'entertainment'
      },
      {
        id: 'amex-plat-saks',
        name: 'Saks Fifth Avenue',
        description: '$50 semi-annually (Jan-Jun, Jul-Dec)',
        value: 50,
        resetPeriod: 'semi-annual',
        category: 'shopping'
      },
      {
        id: 'amex-plat-airline',
        name: 'Airline Fee Credit',
        description: '$200/calendar year statement credit',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'amex-plat-hotel',
        name: 'Hotel Credit',
        description: '$200/year credit on Fine Hotels + Resorts / HC',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'amex-plat-walmart',
        name: 'Walmart+ Membership',
        description: '$12.95/month statement credit for Walmart+ monthly membership ($155/yr)',
        value: 13,
        resetPeriod: 'monthly',
        category: 'shopping'
      },
      {
        id: 'amex-plat-clear',
        name: 'CLEAR Plus Credit',
        description: '$189/calendar year statement credit for CLEAR Plus membership',
        value: 189,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'amex-plat-lululemon',
        name: 'Lululemon Credit',
        description: '$75 quarterly statement credit at Lululemon',
        value: 75,
        resetPeriod: 'quarterly',
        category: 'shopping'
      },
      {
        id: 'amex-plat-resy-plat',
        name: 'Resy Restaurant Credit',
        description: '$100 quarterly statement credit at Resy restaurants',
        value: 100,
        resetPeriod: 'quarterly',
        category: 'dining'
      }
    ]
  },
  {
    id: 'amex-bcp',
    name: 'Amex Blue Cash Preferred',
    bank: 'Amex',
    color: 'from-cyan-600 via-blue-800 to-slate-900',
    annualFee: 95,
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
    color: 'from-zinc-600 via-zinc-700 to-slate-900',
    annualFee: 695,
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
      }
    ]
  },
  {
    id: 'amex-delta-platinum',
    name: 'Amex Delta SkyMiles Platinum',
    bank: 'Amex',
    color: 'from-blue-950 via-slate-900 to-red-950',
    annualFee: 350,
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
    annualFee: 550,
    benefits: [
      {
        id: 'csr-travel',
        name: 'Travel Credit',
        description: '$300 annual travel statement credit',
        value: 300,
        resetPeriod: 'annual-anniversary',
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
      {
        id: 'cff-lyft',
        name: 'Lyft Benefit',
        description: '$10 monthly Lyft credit after taking 3 rides in a calendar month',
        value: 10,
        resetPeriod: 'monthly',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-marriott-brilliant',
    name: 'Chase Marriott Bonvoy Brilliant',
    bank: 'Chase',
    color: 'from-slate-900 via-zinc-900 to-black',
    annualFee: 650,
    benefits: [
      {
        id: 'brilliant-dining',
        name: 'Marriott Dining Credit',
        description: 'Up to $300/year ($25 monthly worldwide dining statement credit)',
        value: 25,
        resetPeriod: 'monthly',
        category: 'dining'
      },
      {
        id: 'brilliant-fnr',
        name: 'Annual Free Night (85K)',
        description: 'Anniversary Free Night Certificate valid for stays up to 85,000 points',
        value: 400,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  },
  {
    id: 'chase-hyatt',
    name: 'Chase World of Hyatt',
    bank: 'Chase',
    color: 'from-blue-600 via-sky-850 to-slate-950',
    annualFee: 95,
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
    bank: 'Capital One',
    color: 'from-teal-600 to-emerald-800',
    annualFee: 395,
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
  }
];
