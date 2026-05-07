export interface Benefit {
  id: string;
  name: string;
  description: string;
  value: number;
  resetPeriod: 'monthly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed';
  category: 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other';
  expirationDate?: string; // e.g., '2026-12-31' (only for 'fixed' resetPeriod)
}

export interface CardTemplate {
  id: string;
  name: string;
  bank: 'Amex' | 'Chase' | 'Capital One' | 'Other';
  color: string; // Tailwind gradient classes
  benefits: Benefit[];
}

export const CARDS_DB: CardTemplate[] = [
  {
    id: 'amex-gold',
    name: 'American Express Gold',
    bank: 'Amex',
    color: 'from-amber-500 to-yellow-600',
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
      }
    ]
  },
  {
    id: 'amex-platinum',
    name: 'American Express Platinum',
    bank: 'Amex',
    color: 'from-slate-300 to-slate-500',
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
      }
    ]
  },
  {
    id: 'amex-hilton-aspire',
    name: 'Amex Hilton Aspire',
    bank: 'Amex',
    color: 'from-indigo-900 via-violet-950 to-slate-950',
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
    id: 'chase-sapphire-reserve',
    name: 'Chase Sapphire Reserve',
    bank: 'Chase',
    color: 'from-blue-700 to-indigo-900',
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
    id: 'capital-one-venture-x',
    name: 'Capital One Venture X',
    bank: 'Capital One',
    color: 'from-teal-600 to-emerald-800',
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
  }
];
