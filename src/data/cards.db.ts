export interface Benefit {
  id: string;
  name: string;
  description: string;
  value: number;
  resetPeriod: 'monthly' | 'quarterly' | 'semi-annual' | 'annual-calendar' | 'annual-anniversary' | 'fixed' | 'once';
  category: 'dining' | 'travel' | 'shopping' | 'entertainment' | 'other' | 'rotating';
  expirationDate?: string; // e.g., '2026-12-31' (only for 'fixed' or 'once' resetPeriod)
  spendingLimit?: number; // e.g., 1500 for CFF 5%, 6000 for BCP 6% (only for progressive limit perks)
  type?: 'built-in' | 'custom' | 'welcome-offer';
  matchedDomains?: string[]; // Domains where this perk should be reminded!
  subCategories?: string[]; // Sub-merchants for rotating categories (e.g., ['Amazon.com', 'Restaurants'])
  activeCoreCategories?: ('dining' | 'travel' | 'shopping' | 'entertainment' | 'other')[]; // AI mapped overlaps
  isSubscription?: boolean; // True if user enabled subscription Auto-Claim!
}

export type PointCurrency = 'amex-mr' | 'chase-ur' | 'citi-typ' | 'capitalone-miles' | 'hyatt' | 'marriott' | 'ihg' | 'hilton' | 'aa-miles' | 'ua-miles' | 'delta-miles' | 'cash';

export interface CardTemplate {
  id: string;
  name: string;
  bank: 'Amex' | 'Chase' | 'Citi' | 'Other';
  color: string; // Tailwind gradient classes
  annualFee: number; // USD Annual Fee of the card
  pointCurrency?: PointCurrency; // Associated reward currency (defaults to cash)
  benefits: Benefit[];
  officialUrl?: string; // Official card application / detail landing page URL
  signupBonusValue?: number; // Pre-populated signup bonus value in USD
}

export interface StaticAwardTemplate {
  name: string;
  brand: string; // e.g., "Hyatt", "Marriott", "Alaska", "Delta", "AA", "Amex", "Other"
  programType: 'hotel' | 'airline' | 'bank' | 'other';
  awardType: 'fnr' | 'sua' | 'goh' | 'companion' | 'swu' | 'points' | 'other';
  value: number; // Pre-configured estimated USD cash value
  description?: string; // Descriptive text explaining what this certificate actually does!
}

export const AWARD_TEMPLATES: Record<string, StaticAwardTemplate> = {
  'hyatt-sua': {
    name: 'Hyatt Suite Upgrade Award (SUA)',
    brand: 'Hyatt',
    programType: 'hotel',
    awardType: 'sua',
    value: 50,
    description: 'Confirm a suite upgrade at booking for stays up to 7 nights.'
  },
  'hyatt-goh': {
    name: 'Hyatt Guest of Honor Award',
    brand: 'Hyatt',
    programType: 'hotel',
    awardType: 'goh',
    value: 80,
    description: 'Gift Hyatt Globalist in-hotel benefits to family or friends.'
  },
  'hyatt-c4-fnr': {
    name: 'Hyatt Category 1-4 Free Night Award',
    brand: 'Hyatt',
    programType: 'hotel',
    awardType: 'fnr',
    value: 150,
    description: 'Redeem for a free night at any Category 1-4 Hyatt hotel or resort.'
  },
  'hyatt-c7-fnr': {
    name: 'Hyatt Category 1-7 Free Night Award',
    brand: 'Hyatt',
    programType: 'hotel',
    awardType: 'fnr',
    value: 300,
    description: 'Redeem for a free night at any Category 1-7 Hyatt hotel or resort.'
  },
  'marriott-nua': {
    name: 'Marriott Nightly Upgrade Award (NUA)',
    brand: 'Marriott',
    programType: 'hotel',
    awardType: 'sua',
    value: 30,
    description: 'Request a premium room or suite upgrade per night.'
  },
  'marriott-85k-fnr': {
    name: 'Marriott 85K Free Night Award',
    brand: 'Marriott',
    programType: 'hotel',
    awardType: 'fnr',
    value: 300,
    description: 'Redeem for a free night up to 85,000 points at Marriott hotels.'
  },
  'marriott-50k-fnr': {
    name: 'Marriott 50K Free Night Award',
    brand: 'Marriott',
    programType: 'hotel',
    awardType: 'fnr',
    value: 180,
    description: 'Redeem for a free night up to 50,000 points at Marriott hotels.'
  },
  'marriott-35k-fnr': {
    name: 'Marriott 35K Free Night Award',
    brand: 'Marriott',
    programType: 'hotel',
    awardType: 'fnr',
    value: 130,
    description: 'Redeem for a free night up to 35,000 points at Marriott hotels.'
  },
  'hilton-fnr': {
    name: 'Hilton Free Night Reward (FNR)',
    brand: 'Hilton',
    programType: 'hotel',
    awardType: 'fnr',
    value: 250,
    description: 'Redeem for a free night at almost any participating Hilton hotel or resort worldwide.'
  },
  'ihg-fnr': {
    name: 'IHG 40K Free Night Award',
    brand: 'IHG',
    programType: 'hotel',
    awardType: 'fnr',
    value: 150,
    description: 'Redeem for a free night up to 40,000 points at IHG hotels (can be topped up with unlimited points).'
  },
  'alaska-companion': {
    name: 'Alaska Companion Fare Certificate',
    brand: 'Alaska',
    programType: 'airline',
    awardType: 'companion',
    value: 99,
    description: 'Book a companion round-trip fare from $121 ($99 fare + taxes).'
  },
  'delta-companion': {
    name: 'Delta Companion Certificate',
    brand: 'Delta',
    programType: 'airline',
    awardType: 'companion',
    value: 200,
    description: 'Receive a companion domestic round-trip ticket upon card renewal.'
  },
  'aa-swu': {
    name: 'AA Systemwide Upgrade (SWU)',
    brand: 'AA',
    programType: 'airline',
    awardType: 'swu',
    value: 250,
    description: 'Confirm a one-way systemwide upgrade to business or first class.'
  },
  'united-club-pass': {
    name: 'United Club One-Time Pass',
    brand: 'United',
    programType: 'airline',
    awardType: 'other',
    value: 30,
    description: 'Access any United Club lounge location for one person ($59 retail value).'
  },
  'southwest-companion': {
    name: 'Southwest Companion Pass',
    brand: 'Southwest',
    programType: 'airline',
    awardType: 'companion',
    value: 500,
    description: 'Designate a companion to fly with you free of airline charges (does not include taxes/fees).'
  },
  'custom': {
    name: 'Custom Voucher',
    brand: 'Other',
    programType: 'other',
    awardType: 'other',
    value: 0,
    description: 'Custom standalone loyalty award or certificate.'
  }
};

export interface LoyaltyAward {
  id: string; // Unique instance ID
  templateId: string; // References key of AWARD_TEMPLATES (e.g. 'hyatt-sua' or 'custom')
  expirationDate?: string; // 'YYYY-MM-DD' (optional)
  quantity: number;
  usedQuantity: number; // Track used count instead of binary isUsed!
  lastModified: number; // LWW timestamp
  parentCardId?: string; // Optional: if attached to a card
  notes?: string;

  // Custom overrides (only populated if templateId === 'custom')
  customName?: string;
  customBrand?: string;
  customProgramType?: 'hotel' | 'airline' | 'bank' | 'other';
  customAwardType?: 'fnr' | 'sua' | 'goh' | 'companion' | 'swu' | 'points' | 'other';
  customValue?: number;
}

export const CARDS_DB: CardTemplate[] = [
  {
    id: 'amex-gold',
    name: 'Amex Gold',
    bank: 'Amex',
    color: 'from-[#c5a059] via-[#fdf2d5] to-[#9c7a3c]',
    annualFee: 320,
    pointCurrency: 'amex-mr',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
    signupBonusValue: 800,
    benefits: [
      {
        id: 'amex-gold-uber',
        name: 'Uber Cash',
        description: '$10/month for Uber rides or Uber Eats',
        value: 10,
        resetPeriod: 'monthly',
        category: 'dining',
        matchedDomains: ['uber.com', 'ubereats.com']
      },
      {
        id: 'amex-gold-dining',
        name: 'Dining Credit',
        description: '$10/month at Grubhub, Cheesecake Factory, etc.',
        value: 10,
        resetPeriod: 'monthly',
        category: 'dining',
        matchedDomains: ['grubhub.com', 'cheesecakefactory.com']
      },
      {
        id: 'amex-gold-resy',
        name: 'Resy Credit',
        description: '$50 semi-annually (Jan-Jun, Jul-Dec) statement credit for Resy bookings',
        value: 50,
        resetPeriod: 'semi-annual',
        category: 'dining',
        spendingLimit: 50,
        matchedDomains: ['resy.com']
      },
      {
        id: 'amex-gold-dunkin',
        name: 'Dunkin Credit',
        description: '$7/month statement credit at U.S. Dunkin locations',
        value: 7,
        resetPeriod: 'monthly',
        category: 'dining',
        matchedDomains: ['dunkin.com', 'dunkindonuts.com']
      }
    ]
  },
  {
    id: 'amex-platinum',
    name: 'Amex Platinum',
    bank: 'Amex',
    color: 'from-slate-400 via-slate-200 to-slate-600',
    annualFee: 895,
    pointCurrency: 'amex-mr',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
    signupBonusValue: 1250,
    benefits: [
      {
        id: 'amex-plat-uber',
        name: 'Uber Cash',
        description: '$15/month ($35 in Dec) for Uber or Uber Eats purchases',
        value: 15,
        resetPeriod: 'monthly',
        category: 'dining',
        matchedDomains: ['uber.com', 'ubereats.com']
      },
      {
        id: 'amex-plat-entertainment',
        name: 'Digital Entertainment',
        description: '$25/month statement credit for YouTube Premium, Disney Bundle, Hulu, etc.',
        value: 25,
        resetPeriod: 'monthly',
        category: 'entertainment',
        matchedDomains: ['youtube.com', 'disneyplus.com', 'hulu.com']
      },
      {
        id: 'amex-plat-airline',
        name: 'Airline Fee Credit',
        description: '$200/calendar year statement credit for airline baggage & lounge incidentals',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        spendingLimit: 200
      },
      {
        id: 'amex-plat-hotel',
        name: 'FHR Hotel Credit',
        description: '$300 statement credit twice a year for prepaid Fine Hotels & Resorts bookings',
        value: 300,
        resetPeriod: 'semi-annual',
        category: 'travel',
        spendingLimit: 300
      },
      {
        id: 'amex-plat-walmart',
        name: 'Walmart+ Membership',
        description: '$12.95/month statement credit to fully cover Walmart+ monthly membership',
        value: 13,
        resetPeriod: 'monthly',
        category: 'shopping',
        matchedDomains: ['walmart.com']
      },
      {
        id: 'amex-plat-clear',
        name: 'CLEAR Plus Credit',
        description: '$209/calendar year statement credit to fully cover CLEAR Plus security membership',
        value: 209,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        matchedDomains: ['clearme.com']
      },
      {
        id: 'amex-plat-lululemon',
        name: 'Lululemon Credit',
        description: '$75 quarterly statement credit at Lululemon stores or online',
        value: 75,
        resetPeriod: 'quarterly',
        category: 'shopping',
        spendingLimit: 75,
        matchedDomains: ['lululemon.com']
      },
      {
        id: 'amex-plat-resy-plat',
        name: 'Resy Restaurant Credit',
        description: '$100 quarterly statement credit for dining at Resy restaurants',
        value: 100,
        resetPeriod: 'quarterly',
        category: 'dining',
        spendingLimit: 100,
        matchedDomains: ['resy.com']
      },
      {
        id: 'amex-plat-uber-one',
        name: 'Uber One Credit',
        description: '$120/calendar year statement credit to fully cover Uber One subscription',
        value: 120,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        matchedDomains: ['uber.com']
      },
      {
        id: 'amex-plat-saks',
        name: 'Saks Fifth Avenue Credit',
        description: '$50 semi-annually (Jan-Jun, Jul-Dec) statement credit for Saks Fifth Avenue purchases',
        value: 50,
        resetPeriod: 'semi-annual',
        category: 'shopping',
        spendingLimit: 50,
        matchedDomains: ['saksfifthavenue.com']
      },
      {
        id: 'amex-plat-oura',
        name: 'Oura Ring Credit',
        description: '$200/calendar year statement credit for Oura Ring hardware or subscription purchases',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'shopping',
        spendingLimit: 200,
        matchedDomains: ['ouraring.com']
      }
    ]
  },
  {
    id: 'amex-bcp',
    name: 'Amex Blue Cash Preferred',
    bank: 'Amex',
    color: 'from-cyan-600 via-blue-800 to-slate-900',
    annualFee: 95,
    pointCurrency: 'cash',
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
    pointCurrency: 'delta-miles',
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
    pointCurrency: 'amex-mr',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/american-express-business-platinum-credit-card-amex/',
    signupBonusValue: 1500,
    benefits: [
      {
        id: 'biz-plat-hotel',
        name: 'Hotel Credit',
        description: 'Up to $300 statement credit semi-annually (Jan-Jun, Jul-Dec) for prepaid Fine Hotels + Resorts or The Hotel Collection bookings through American Express Travel',
        value: 300,
        resetPeriod: 'semi-annual',
        category: 'travel'
      },
      {
        id: 'biz-plat-airline',
        name: 'Airline Fee Credit',
        description: 'Up to $200 statement credit per calendar year for incidental fees charged by a selected qualifying airline',
        value: 200,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      },
      {
        id: 'biz-plat-adobe',
        name: 'Adobe Credit',
        description: '$250 statement credit per calendar year after you spend $600 or more on U.S. purchases directly with Adobe',
        value: 250,
        spendingLimit: 600,
        resetPeriod: 'annual-calendar',
        category: 'shopping'
      },
      {
        id: 'biz-plat-chatgpt',
        name: 'ChatGPT Business Credit',
        description: 'Up to $300 statement credit per calendar year on U.S. purchases of ChatGPT Business',
        value: 300,
        resetPeriod: 'annual-calendar',
        category: 'shopping'
      },
      {
        id: 'biz-plat-dell',
        name: 'Dell Credit',
        description: 'Up to $150 statement credit per calendar year on U.S. purchases directly with Dell Technologies',
        value: 150,
        resetPeriod: 'annual-calendar',
        category: 'shopping'
      },
      {
        id: 'biz-plat-wireless',
        name: 'Wireless Credit',
        description: 'Statement credits up to $10 per month for wireless phone service purchases made directly with a U.S. wireless telephone service provider',
        value: 10,
        resetPeriod: 'monthly',
        category: 'other'
      }
    ]
  },
  {
    id: 'amex-hilton-aspire',
    name: 'Amex Hilton Aspire',
    bank: 'Amex',
    color: 'from-indigo-900 via-violet-950 to-slate-950',
    annualFee: 550,
    pointCurrency: 'hilton',
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
    pointCurrency: 'delta-miles',
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
    pointCurrency: 'chase-ur',
    officialUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
    signupBonusValue: 900,
    benefits: [
      {
        id: 'csr-travel',
        name: 'Travel Credit',
        description: '$300 annual travel statement credit for flights, hotels, transit, and tolls',
        value: 300,
        resetPeriod: 'annual-anniversary',
        category: 'travel',
        spendingLimit: 300
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
    color: 'from-blue-800 to-indigo-900',
    annualFee: 95,
    pointCurrency: 'chase-ur',
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
    pointCurrency: 'chase-ur',
    officialUrl: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/flex',
    benefits: [
      {
        id: 'cff-rotating',
        name: '5% Rotating Category',
        description: 'Q2 2026 (Apr-Jun): Amazon.com and Chase Travel (5% cash back on up to $1,500 spend)',
        value: 75, // $1500 * 5%
        resetPeriod: 'quarterly',
        category: 'rotating',
        spendingLimit: 1500,
        subCategories: ['Amazon.com', 'Chase Travel'],
        activeCoreCategories: ['shopping'],
        matchedDomains: ['amazon.com', 'wholefoodsmarket.com', 'chasetravel.com']
      },

    ]
  },

  {
    id: 'chase-hyatt',
    name: 'Chase World of Hyatt',
    bank: 'Chase',
    color: 'from-blue-600 to-sky-900',
    annualFee: 95,
    pointCurrency: 'hyatt',
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
    pointCurrency: 'marriott',
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
    pointCurrency: 'ihg',
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
    pointCurrency: 'capitalone-miles',
    officialUrl: 'https://www.capitalone.com/credit-cards/venture-x/',
    signupBonusValue: 750,
    benefits: [
      {
        id: 'vx-travel',
        name: 'Travel Credit',
        description: '$300/year credit for Capital One Travel portal bookings',
        value: 300,
        resetPeriod: 'annual-anniversary',
        category: 'travel',
        spendingLimit: 300
      }
    ]
  },
  {
    id: 'discover-it-cashback',
    name: 'Discover it Cash Back',
    bank: 'Other',
    color: 'from-orange-500 via-red-500 to-orange-600',
    annualFee: 0,
    pointCurrency: 'cash',
    officialUrl: 'https://www.discover.com/credit-cards/cashback/',
    benefits: [
      {
        id: 'discover-it-rotating',
        name: '5% Rotating Category',
        description: 'Q2 2026 (Apr-Jun): Restaurants and Home Improvement Stores (5% cash back on up to $1,500 spend)',
        value: 75,
        resetPeriod: 'quarterly',
        category: 'rotating',
        spendingLimit: 1500,
        subCategories: ['Restaurants', 'Home Improvement'],
        activeCoreCategories: ['dining', 'shopping']
      }
    ]
  },
  {
    id: 'amex-marriott-brilliant',
    name: 'Amex Marriott Bonvoy Brilliant',
    bank: 'Amex',
    color: 'from-neutral-900 via-stone-950 to-stone-900',
    annualFee: 650,
    pointCurrency: 'marriott',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-brilliant/',
    benefits: [
      {
        id: 'marriott-brilliant-dining',
        name: 'Dining Credit',
        description: 'Get up to $25 back per month in statement credits for global restaurant purchases.',
        value: 25,
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
    pointCurrency: 'citi-typ',
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
    pointCurrency: 'amex-mr',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/american-express-business-gold-card-amex/',
    benefits: [
      {
        id: 'biz-gold-office-transit',
        name: 'Office Supply & Transit Credit',
        description: 'Get up to $20 back per month in statement credits for U.S. office supply store or transit purchases.',
        value: 20,
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
    pointCurrency: 'chase-ur',
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
    pointCurrency: 'chase-ur',
    officialUrl: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited',
    benefits: []
  },
  {
    id: 'amex-bce',
    name: 'Amex Blue Cash Everyday',
    bank: 'Amex',
    color: 'from-sky-600 via-sky-700 to-blue-800',
    annualFee: 0,
    pointCurrency: 'cash',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/',
    benefits: [
      {
        id: 'bce-disney',
        name: 'Disney Bundle Credit',
        description: 'Get a $7 monthly statement credit after spending $9.99 or more on Disney Bundle subscriptions.',
        value: 7,
        resetPeriod: 'monthly',
        category: 'shopping'
      },
      {
        id: 'bce-homechef',
        name: 'Home Chef Credit',
        description: 'Get up to $15 back per month in statement credits for Home Chef meal kit purchases.',
        value: 15,
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
    pointCurrency: 'citi-typ',
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
    pointCurrency: 'aa-miles',
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
  },
  {
    id: 'citibusiness-aa-platinum-select',
    name: 'Citi Business AAdvantage Platinum Select',
    bank: 'Citi',
    color: 'from-blue-900 via-slate-800 to-sky-950',
    annualFee: 99,
    pointCurrency: 'aa-miles',
    officialUrl: 'https://www.citi.com/credit-cards/citibusiness-aadvantage-platinum-select-mastercard',
    signupBonusValue: 975,
    benefits: [
      {
        id: 'citibiz-aa-bag',
        name: 'First Checked Bag Free',
        description: 'Free first checked bag on domestic American Airlines flights for you and up to 4 companions on the same reservation.',
        value: 120,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        matchedDomains: ['aa.com']
      },
      {
        id: 'citibiz-aa-companion',
        name: '$99 Companion Certificate',
        description: 'Earn a domestic main cabin companion certificate ($99 ticketing fee applies) after spending $30,000 or more each cardmember anniversary year.',
        value: 200,
        resetPeriod: 'annual-anniversary',
        category: 'travel',
        spendingLimit: 30000,
        matchedDomains: ['aa.com']
      },
      {
        id: 'citibiz-aa-wifi',
        name: '25% In-Flight Savings',
        description: '25% savings on in-flight Wi-Fi, food, and beverage purchases on American Airlines flights.',
        value: 25,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        matchedDomains: ['aa.com']
      }
    ]
  },
  {
    id: 'chase-ink-preferred',
    name: 'Chase Ink Business Preferred',
    bank: 'Chase',
    color: 'from-[#0b2545] to-[#134074]',
    annualFee: 95,
    pointCurrency: 'chase-ur',
    officialUrl: 'https://creditcards.chase.com/business-credit-cards/ink/business-preferred',
    benefits: [
      {
        id: 'chase-ink-preferred-telecom',
        name: '3x Points on Internet & Ads',
        description: 'Earn 3x points on the first $150,000 spent on shipping, ads, internet, and telecom each anniversary year',
        value: 0,
        resetPeriod: 'annual-anniversary',
        category: 'other',
        spendingLimit: 150000
      },
      {
        id: 'chase-ink-preferred-cell-protection',
        name: 'Cell Phone Protection',
        description: 'Up to $1,000 per claim against theft or damage for you and your employees when you pay your monthly bill with this card',
        value: 0,
        resetPeriod: 'fixed',
        category: 'other'
      },
      {
        id: 'chase-ink-preferred-rental',
        name: 'Primary Auto Rental Collision Waiver',
        description: 'Coverage is primary when renting for business purposes, providing reimbursement up to the actual cash value of the vehicle for theft and collision damage',
        value: 0,
        resetPeriod: 'fixed',
        category: 'travel'
      },
      {
        id: 'chase-ink-preferred-trip',
        name: 'Trip Cancellation/Interruption Insurance',
        description: 'If your trip is canceled or cut short by covered situations, you can be reimbursed up to $5,000 per person',
        value: 0,
        resetPeriod: 'fixed',
        category: 'travel'
      }
    ]
  },
  {
    id: 'amex-everyday',
    name: 'Amex EveryDay',
    bank: 'Amex',
    color: 'from-[#8a9a5b] to-[#c1cdc1]',
    annualFee: 0,
    pointCurrency: 'amex-mr',
    benefits: []
  },
  {
    id: 'amex-bbp',
    name: 'Amex Blue Business Plus',
    bank: 'Amex',
    color: 'from-blue-400 via-blue-200 to-blue-600',
    annualFee: 0,
    pointCurrency: 'amex-mr',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/blue-business-plus-credit-card-amex/',
    benefits: []
  },
  {
    id: 'amex-hilton-surpass',
    name: 'Amex Hilton Honors Surpass',
    bank: 'Amex',
    color: 'from-[#2c3e50] to-[#3498db]',
    annualFee: 150,
    pointCurrency: 'hilton',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/hilton-honors-surpass/',
    benefits: [
      {
        id: 'amex-hilton-surpass-credit',
        name: 'Hilton Statement Credit',
        description: '$50 per quarter statement credit for purchases made directly with a property in the Hilton portfolio',
        value: 50,
        resetPeriod: 'quarterly',
        category: 'travel',
        spendingLimit: 50
      }
    ]
  },
  {
    id: 'amex-delta-blue',
    name: 'Amex Delta SkyMiles Blue',
    bank: 'Amex',
    color: 'from-[#003366] to-[#336699]',
    annualFee: 0,
    pointCurrency: 'delta-miles',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-blue-american-express-card/',
    benefits: []
  },
  {
    id: 'usbank-altitude-go',
    name: 'U.S. Bank Altitude Go Visa Signature Card',
    bank: 'Other',
    color: 'from-[#1a0933] via-[#4a1c73] to-[#8e44ad]',
    annualFee: 0,
    pointCurrency: 'cash',
    officialUrl: 'https://www.usbank.com/credit-cards/altitude-go-visa-signature-credit-card.html',
    benefits: [
      {
        id: 'usbank-altitude-go-streaming',
        name: '$15 Streaming Credit',
        description: '$15 statement credit after 11 consecutive months of eligible streaming service purchases',
        value: 15,
        resetPeriod: 'annual-anniversary',
        category: 'entertainment'
      }
    ]
  },
  {
    id: 'citi-double-cash',
    name: 'Citi Double Cash Card',
    bank: 'Citi',
    color: 'from-blue-500 to-sky-600',
    annualFee: 0,
    pointCurrency: 'citi-typ',
    officialUrl: 'https://www.citi.com/credit-cards/citi-double-cash-credit-card',
    benefits: []
  },
  {
    id: 'capone-savorone',
    name: 'Capital One SavorOne Cash Rewards',
    bank: 'Other',
    color: 'from-amber-700 via-orange-600 to-red-700',
    annualFee: 0,
    pointCurrency: 'cash',
    officialUrl: 'https://www.capitalone.com/credit-cards/savorone-dining-and-groceries/',
    benefits: []
  },
  {
    id: 'apple-card',
    name: 'Apple Card',
    bank: 'Other',
    color: 'from-slate-100 via-slate-200 to-white',
    annualFee: 0,
    pointCurrency: 'cash',
    officialUrl: 'https://www.apple.com/apple-card/',
    benefits: []
  },
  {
    id: 'capone-venture',
    name: 'Capital One Venture Rewards',
    bank: 'Other',
    color: 'from-teal-900 via-teal-800 to-cyan-950',
    annualFee: 95,
    pointCurrency: 'capitalone-miles',
    officialUrl: 'https://www.capitalone.com/credit-cards/venture/',
    signupBonusValue: 1350,
    benefits: [
      {
        id: 'capone-venture-lounge',
        name: 'Capital One Lounge Passes',
        description: '2 complimentary visits per year to Capital One Lounges or Plaza Premium Lounges',
        value: 90,
        resetPeriod: 'annual-calendar',
        category: 'travel'
      }
    ]
  },
  {
    id: 'amex-green',
    name: 'Amex Green Card',
    bank: 'Amex',
    color: 'from-emerald-800 via-green-700 to-emerald-950',
    annualFee: 150,
    pointCurrency: 'amex-mr',
    officialUrl: 'https://www.americanexpress.com/us/credit-cards/card/green/',
    signupBonusValue: 640,
    benefits: [
      {
        id: 'amex-green-clear',
        name: 'CLEAR Plus Credit',
        description: '$189 per calendar year statement credit for CLEAR Plus security membership',
        value: 189,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        matchedDomains: ['clearme.com']
      },
      {
        id: 'amex-green-loungebuddy',
        name: 'LoungeBuddy Credit',
        description: '$100 per calendar year statement credit for airport lounge access purchased through LoungeBuddy',
        value: 100,
        resetPeriod: 'annual-calendar',
        category: 'travel',
        spendingLimit: 100
      }
    ]
  },
  {
    id: 'chase-amazon-prime',
    name: 'Amazon Prime Rewards Visa Signature',
    bank: 'Chase',
    color: 'from-slate-800 via-slate-900 to-amber-950',
    annualFee: 0,
    pointCurrency: 'cash',
    officialUrl: 'https://www.amazon.com/primevisa',
    signupBonusValue: 100,
    benefits: [
      {
        id: 'amazon-prime-cashback',
        name: '5% Amazon & Whole Foods',
        description: '5% cash back on online purchases at Amazon.com and in-store at Whole Foods Market',
        value: 100,
        resetPeriod: 'annual-calendar',
        category: 'shopping',
        matchedDomains: ['amazon.com', 'wholefoodsmarket.com']
      }
    ]
  },
  {
    id: 'chase-southwest-priority',
    name: 'Southwest Rapid Rewards Priority',
    bank: 'Chase',
    color: 'from-blue-800 via-blue-900 to-yellow-600',
    annualFee: 149,
    pointCurrency: 'cash',
    officialUrl: 'https://creditcards.chase.com/travel-credit-cards/southwest/priority',
    signupBonusValue: 700,
    benefits: [
      {
        id: 'southwest-priority-credit',
        name: '$75 Annual Southwest Credit',
        description: '$75 statement credit each anniversary year for Southwest Airlines purchases',
        value: 75,
        resetPeriod: 'annual-anniversary',
        category: 'travel',
        matchedDomains: ['southwest.com']
      },
      {
        id: 'southwest-priority-anniversary',
        name: '7,500 Anniversary Points',
        description: 'Receive 7,500 bonus points each year on your cardmember anniversary (valued at ~$105)',
        value: 105,
        resetPeriod: 'annual-anniversary',
        category: 'travel'
      }
    ]
  }
];

export const CARD_MULTIPLIERS: Record<string, { dining?: number; travel?: number; shopping?: number; entertainment?: number }> = {
  'amex-gold': { dining: 4, shopping: 4 }, // 4x Dining, 4x Groceries
  'amex-bbp': { dining: 2, travel: 2, shopping: 2, entertainment: 2 }, // 2x on everything
  'chase-ink-preferred': { travel: 3 },
  'amex-everyday': { shopping: 2 },
  'amex-hilton-surpass': { dining: 6, shopping: 6 },
  'amex-delta-blue': { travel: 2, dining: 2 },
  'usbank-altitude-go': { dining: 4, shopping: 2, entertainment: 2 },
  'amex-platinum': { travel: 5 }, // 5x Flights
  'amex-bcp': { shopping: 6, entertainment: 6 }, // 6% Groceries, 6% Streaming
  'amex-delta-reserve': { travel: 3 }, // 3x Delta
  'amex-delta-platinum': { travel: 3, dining: 2, shopping: 2 }, // 3x Delta, 2x Dining, 2x Groceries
  'amex-biz-platinum': { travel: 5 }, // 5x Flights
  'amex-hilton-aspire': { travel: 7, dining: 7 }, // 14x Hilton, 7x Flights/Dining
  'chase-sapphire-reserve': { travel: 3, dining: 3 }, // 3x Travel, 3x Dining
  'chase-sapphire-preferred': { dining: 3, travel: 2, entertainment: 3 }, // 3x Dining, 3x Streaming, 2x Travel
  'chase-freedom-flex': { dining: 3 }, // 3x Dining, 3x Drugstores
  'chase-hyatt': { travel: 4, dining: 2 }, // 4x Hyatt, 2x Dining
  'chase-marriott-boundless': { travel: 6, dining: 2 }, // 6x Marriott, 2x Dining
  'chase-ihg-premier': { travel: 10, dining: 5 }, // 10x IHG, 5x Dining
  'capital-one-venture-x': { travel: 2, dining: 2, shopping: 2, entertainment: 2 }, // 2x everything
  'amex-marriott-brilliant': { travel: 6, dining: 3 }, // 6x Marriott, 3x Dining
  'citi-custom-cash': { shopping: 5 }, // 5x top category
  'amex-biz-gold': { travel: 4, shopping: 4 }, // 4x transit/office
  'chase-ink-cash': { shopping: 5 }, // 5x office/telecom
  'chase-freedom-unlimited': { dining: 3, travel: 1.5, shopping: 1.5 }, // 3x dining, 1.5x flat
  'amex-bce': { shopping: 3 }, // 3x groceries/online
  'citi-premier': { travel: 3, dining: 3, shopping: 3 }, // 3x travel/dining/supermarket
  'citi-aa-platinum-select': { travel: 2, dining: 2, shopping: 2 }, // 2x AA Flights/Dining/Gas Stations
  'citibusiness-aa-platinum-select': { travel: 2, shopping: 1, dining: 1 }, // 2x AA, Telecom, Car Rental, Gas
  'citi-double-cash': { dining: 2, travel: 2, shopping: 2, entertainment: 2 },
  'capone-savorone': { dining: 3, shopping: 3, entertainment: 3 },
  'apple-card': { shopping: 2, dining: 2 },
  'capone-venture': { dining: 2, travel: 2, shopping: 2, entertainment: 2 },
  'amex-green': { travel: 3, dining: 3 },
  'chase-amazon-prime': { shopping: 5, dining: 2 },
  'chase-southwest-priority': { travel: 2 }
};



export const DEFAULT_VALUATIONS: Record<PointCurrency, number> = {
  'chase-ur': 1.6,
  'amex-mr': 1.6,
  'capitalone-miles': 1.8,
  'citi-typ': 1.8,
  'hyatt': 1.4,
  'marriott': 0.8,
  'ihg': 0.5,
  'hilton': 0.5,
  'aa-miles': 1.5,
  'ua-miles': 1.3,
  'delta-miles': 1.2,
  'cash': 1.0,
};
