// ---------------------------------------------------------------------------
// Credit Card Rewards Database & Merchant Category Mapping
// ---------------------------------------------------------------------------
// Comprehensive static database of popular US credit cards, their reward
// structures, and a merchant-to-category mapping used to calculate the best
// card to use for any given purchase.
// ---------------------------------------------------------------------------

export interface CardReward {
  category: string | null; // null = all purchases (base rate)
  merchantName?: string; // specific merchant bonus
  rate: number; // percentage back
  type: "cashback" | "points" | "miles";
  pointValue?: number; // value per point in cents
  cap?: number; // annual cap in dollars of spend
  rotating?: boolean; // quarterly rotating category
  note?: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  issuer: string;
  network: "visa" | "mastercard" | "amex" | "discover" | "other";
  annualFee: number;
  rewards: CardReward[];
  signupBonus?: string;
  perks?: string[];
}

// ---------------------------------------------------------------------------
// 1. CARD_DATABASE
// ---------------------------------------------------------------------------

export const CARD_DATABASE: CardTemplate[] = [
  // =========================================================================
  // CHASE
  // =========================================================================
  {
    id: "chase-sapphire-preferred",
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    network: "visa",
    annualFee: 95,
    rewards: [
      { category: "Dining", rate: 3, type: "points", pointValue: 1.25 },
      { category: "Travel", rate: 2, type: "points", pointValue: 1.25 },
      { category: "Online Groceries", rate: 3, type: "points", pointValue: 1.25 },
      { category: "Streaming", rate: 3, type: "points", pointValue: 1.25 },
      { category: null, rate: 1, type: "points", pointValue: 1.25 },
    ],
    signupBonus: "60,000 points after $4,000 in 3 months",
    perks: [
      "25% more value when redeeming via Chase Travel",
      "$50 annual hotel credit via Chase Travel",
      "Trip cancellation/interruption insurance",
      "No foreign transaction fees",
    ],
  },
  {
    id: "chase-sapphire-reserve",
    name: "Chase Sapphire Reserve",
    issuer: "Chase",
    network: "visa",
    annualFee: 550,
    rewards: [
      { category: "Dining", rate: 3, type: "points", pointValue: 1.5 },
      { category: "Travel", rate: 3, type: "points", pointValue: 1.5 },
      {
        category: "Travel",
        rate: 10,
        type: "points",
        pointValue: 1.5,
        note: "Hotels & car rentals booked via Chase Travel portal",
      },
      { category: null, rate: 1, type: "points", pointValue: 1.5 },
    ],
    signupBonus: "60,000 points after $4,000 in 3 months",
    perks: [
      "$300 annual travel credit",
      "50% more value when redeeming via Chase Travel",
      "Priority Pass Select lounge access",
      "Global Entry / TSA PreCheck credit",
      "No foreign transaction fees",
    ],
  },
  {
    id: "chase-freedom-unlimited",
    name: "Chase Freedom Unlimited",
    issuer: "Chase",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: "Dining", rate: 3, type: "cashback" },
      { category: "Drugstores", rate: 3, type: "cashback" },
      { category: null, rate: 1.5, type: "cashback" },
    ],
    signupBonus: "$200 after $500 in 3 months",
    perks: ["0% intro APR for 15 months on purchases and balance transfers"],
  },
  {
    id: "chase-freedom-flex",
    name: "Chase Freedom Flex",
    issuer: "Chase",
    network: "mastercard",
    annualFee: 0,
    rewards: [
      {
        category: "Rotating",
        rate: 5,
        type: "cashback",
        cap: 1500,
        rotating: true,
        note: "5% on quarterly rotating categories (activate each quarter, $1,500 cap per quarter)",
      },
      { category: "Dining", rate: 3, type: "cashback" },
      { category: "Drugstores", rate: 3, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 after $500 in 3 months",
    perks: [
      "5% rotating quarterly bonus categories",
      "0% intro APR for 15 months",
    ],
  },
  {
    id: "chase-ink-business-preferred",
    name: "Chase Ink Business Preferred",
    issuer: "Chase",
    network: "visa",
    annualFee: 95,
    rewards: [
      { category: "Travel", rate: 3, type: "points", pointValue: 1.25, cap: 150000 },
      { category: "Shipping", rate: 3, type: "points", pointValue: 1.25, cap: 150000 },
      { category: "Internet", rate: 3, type: "points", pointValue: 1.25, cap: 150000 },
      { category: "Phone", rate: 3, type: "points", pointValue: 1.25, cap: 150000 },
      { category: "Advertising", rate: 3, type: "points", pointValue: 1.25, cap: 150000 },
      { category: null, rate: 1, type: "points", pointValue: 1.25 },
    ],
    signupBonus: "100,000 points after $8,000 in 3 months",
    perks: [
      "Cell phone protection",
      "Trip cancellation insurance",
      "No foreign transaction fees",
    ],
  },
  {
    id: "chase-amazon-prime-visa",
    name: "Amazon Prime Visa",
    issuer: "Chase",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: null, merchantName: "Amazon", rate: 5, type: "cashback" },
      { category: null, merchantName: "Whole Foods", rate: 5, type: "cashback" },
      { category: "Dining", rate: 2, type: "cashback" },
      { category: "Gas", rate: 2, type: "cashback" },
      { category: "Transit", rate: 2, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 Amazon gift card upon approval",
    perks: [
      "Requires Amazon Prime membership",
      "No foreign transaction fees",
      "Purchase protection",
    ],
  },

  // =========================================================================
  // AMEX
  // =========================================================================
  {
    id: "amex-gold",
    name: "American Express Gold Card",
    issuer: "Amex",
    network: "amex",
    annualFee: 250,
    rewards: [
      { category: "Dining", rate: 4, type: "points", pointValue: 1.0 },
      {
        category: "Groceries",
        rate: 4,
        type: "points",
        pointValue: 1.0,
        cap: 25000,
        note: "4x at US supermarkets up to $25,000/year",
      },
      { category: "Flights", rate: 3, type: "points", pointValue: 1.0 },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "60,000 points after $6,000 in 6 months",
    perks: [
      "$120 dining credit (Grubhub, Seamless, Cheesecake Factory, etc.)",
      "$120 Uber Cash annually",
      "$100 airline fee credit",
      "No foreign transaction fees",
    ],
  },
  {
    id: "amex-platinum",
    name: "American Express Platinum Card",
    issuer: "Amex",
    network: "amex",
    annualFee: 695,
    rewards: [
      {
        category: "Flights",
        rate: 5,
        type: "points",
        pointValue: 1.0,
        note: "Flights booked directly with airlines or via Amex Travel",
      },
      {
        category: "Travel",
        rate: 5,
        type: "points",
        pointValue: 1.0,
        note: "Prepaid hotels booked on amextravel.com",
      },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "80,000 points after $8,000 in 6 months",
    perks: [
      "$200 airline fee credit",
      "$200 hotel credit (Fine Hotels + Resorts / Hotel Collection)",
      "$200 Uber Cash annually",
      "$155 Walmart+ credit",
      "$240 digital entertainment credit",
      "Centurion Lounge access",
      "Global Entry / TSA PreCheck credit",
      "Priority Pass Select",
      "Hilton & Marriott Gold status",
    ],
  },
  {
    id: "amex-blue-cash-preferred",
    name: "Amex Blue Cash Preferred",
    issuer: "Amex",
    network: "amex",
    annualFee: 0,
    rewards: [
      { category: "Groceries", rate: 6, type: "cashback", cap: 6000, note: "6% at US supermarkets up to $6,000/year" },
      { category: "Streaming", rate: 6, type: "cashback" },
      { category: "Transit", rate: 3, type: "cashback" },
      { category: "Gas", rate: 3, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$250 after $3,000 in 6 months",
    perks: [
      "0% intro APR for 12 months on purchases and balance transfers",
      "Return protection",
      "Purchase protection",
    ],
  },
  {
    id: "amex-blue-cash-everyday",
    name: "Amex Blue Cash Everyday",
    issuer: "Amex",
    network: "amex",
    annualFee: 0,
    rewards: [
      { category: "Groceries", rate: 3, type: "cashback", cap: 6000, note: "3% at US supermarkets up to $6,000/year" },
      { category: "Gas", rate: 3, type: "cashback" },
      { category: "Online Shopping", rate: 3, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 after $2,000 in 6 months",
    perks: [
      "0% intro APR for 15 months on purchases and balance transfers",
    ],
  },
  {
    id: "amex-delta-skymiles-gold",
    name: "Delta SkyMiles Gold Card",
    issuer: "Amex",
    network: "amex",
    annualFee: 150,
    rewards: [
      { category: null, merchantName: "Delta Air Lines", rate: 2, type: "miles", pointValue: 1.2 },
      { category: "Dining", rate: 2, type: "miles", pointValue: 1.2 },
      { category: "Groceries", rate: 2, type: "miles", pointValue: 1.2 },
      { category: null, rate: 1, type: "miles", pointValue: 1.2 },
    ],
    signupBonus: "40,000 miles after $2,000 in 6 months",
    perks: [
      "First checked bag free on Delta flights",
      "Priority boarding on Delta flights",
      "$15 Delta flight credit after qualifying purchases",
    ],
  },

  // =========================================================================
  // CAPITAL ONE
  // =========================================================================
  {
    id: "capital-one-venture-x",
    name: "Capital One Venture X",
    issuer: "Capital One",
    network: "visa",
    annualFee: 395,
    rewards: [
      {
        category: "Hotels",
        rate: 10,
        type: "miles",
        pointValue: 1.0,
        note: "Hotels booked via Capital One Travel portal",
      },
      {
        category: "Flights",
        rate: 5,
        type: "miles",
        pointValue: 1.0,
        note: "Flights booked via Capital One Travel portal",
      },
      { category: null, rate: 2, type: "miles", pointValue: 1.0 },
    ],
    signupBonus: "75,000 miles after $4,000 in 3 months",
    perks: [
      "$300 annual travel credit via Capital One Travel",
      "10,000 anniversary miles each year",
      "Capital One Lounge access",
      "Priority Pass & Plaza Premium lounge access",
      "Global Entry / TSA PreCheck credit",
      "Hertz President's Circle status",
      "No foreign transaction fees",
    ],
  },
  {
    id: "capital-one-venture",
    name: "Capital One Venture",
    issuer: "Capital One",
    network: "visa",
    annualFee: 95,
    rewards: [
      { category: null, rate: 2, type: "miles", pointValue: 1.0 },
    ],
    signupBonus: "75,000 miles after $4,000 in 3 months",
    perks: [
      "Global Entry / TSA PreCheck credit",
      "No foreign transaction fees",
      "Transfer miles to 15+ airline and hotel partners",
    ],
  },
  {
    id: "capital-one-savor-one",
    name: "Capital One SavorOne",
    issuer: "Capital One",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: "Dining", rate: 3, type: "cashback" },
      { category: "Entertainment", rate: 3, type: "cashback" },
      { category: "Groceries", rate: 3, type: "cashback" },
      { category: "Streaming", rate: 3, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 after $500 in 3 months",
    perks: [
      "No foreign transaction fees",
      "Extended warranty protection",
    ],
  },
  {
    id: "capital-one-quicksilver",
    name: "Capital One Quicksilver",
    issuer: "Capital One",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: null, rate: 1.5, type: "cashback" },
    ],
    signupBonus: "$200 after $500 in 3 months",
    perks: [
      "0% intro APR for 15 months",
      "No foreign transaction fees",
    ],
  },

  // =========================================================================
  // CITI
  // =========================================================================
  {
    id: "citi-double-cash",
    name: "Citi Double Cash",
    issuer: "Citi",
    network: "mastercard",
    annualFee: 0,
    rewards: [
      {
        category: null,
        rate: 2,
        type: "cashback",
        note: "1% when you buy + 1% when you pay your bill",
      },
    ],
    signupBonus: "$200 after $1,500 in 6 months",
    perks: ["0% intro APR for 18 months on balance transfers"],
  },
  {
    id: "citi-custom-cash",
    name: "Citi Custom Cash",
    issuer: "Citi",
    network: "mastercard",
    annualFee: 0,
    rewards: [
      {
        category: "Dining",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Gas",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Groceries",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Drugstores",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Entertainment",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Fitness",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Transit",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      {
        category: "Streaming",
        rate: 5,
        type: "cashback",
        cap: 500,
        note: "5% on your top eligible spend category each billing cycle (up to $500)",
      },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 after $1,500 in 6 months",
    perks: ["0% intro APR for 15 months on purchases and balance transfers"],
  },
  {
    id: "citi-premier",
    name: "Citi Premier",
    issuer: "Citi",
    network: "mastercard",
    annualFee: 95,
    rewards: [
      { category: "Flights", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Hotels", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Dining", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Groceries", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Gas", rate: 3, type: "points", pointValue: 1.0 },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "60,000 points after $4,000 in 3 months",
    perks: [
      "No foreign transaction fees",
      "Transfer points to airline and hotel partners",
      "$100 annual hotel savings benefit",
    ],
  },

  // =========================================================================
  // DISCOVER
  // =========================================================================
  {
    id: "discover-it-cash-back",
    name: "Discover it Cash Back",
    issuer: "Discover",
    network: "discover",
    annualFee: 0,
    rewards: [
      {
        category: "Rotating",
        rate: 5,
        type: "cashback",
        cap: 1500,
        rotating: true,
        note: "5% on quarterly rotating categories (activate each quarter, $1,500 cap per quarter)",
      },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "Cashback Match: Discover matches all cash back earned in the first year",
    perks: [
      "First-year Cashback Match effectively doubles all rewards",
      "No annual fee",
      "Free FICO credit score",
    ],
  },
  {
    id: "discover-it-miles",
    name: "Discover it Miles",
    issuer: "Discover",
    network: "discover",
    annualFee: 0,
    rewards: [
      { category: null, rate: 1.5, type: "miles", pointValue: 1.0 },
    ],
    signupBonus: "Miles Match: Discover matches all miles earned in the first year",
    perks: [
      "First-year Miles Match effectively doubles all rewards",
      "No annual fee",
      "No foreign transaction fees",
    ],
  },

  // =========================================================================
  // WELLS FARGO
  // =========================================================================
  {
    id: "wells-fargo-active-cash",
    name: "Wells Fargo Active Cash",
    issuer: "Wells Fargo",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: null, rate: 2, type: "cashback" },
    ],
    signupBonus: "$200 after $500 in 3 months",
    perks: [
      "0% intro APR for 15 months",
      "Cell phone protection up to $600",
    ],
  },
  {
    id: "wells-fargo-autograph",
    name: "Wells Fargo Autograph",
    issuer: "Wells Fargo",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: "Dining", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Travel", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Gas", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Transit", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Phone", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Streaming", rate: 3, type: "points", pointValue: 1.0 },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "20,000 points after $1,000 in 3 months",
    perks: [
      "No foreign transaction fees",
      "Cell phone protection up to $600",
    ],
  },

  // =========================================================================
  // BANK OF AMERICA
  // =========================================================================
  {
    id: "boa-customized-cash",
    name: "Bank of America Customized Cash Rewards",
    issuer: "Bank of America",
    network: "visa",
    annualFee: 0,
    rewards: [
      {
        category: "Gas",
        rate: 3,
        type: "cashback",
        cap: 2500,
        note: "3% in your choice category (gas, online shopping, dining, travel, drugstores, or home improvement) up to $2,500/quarter",
      },
      { category: "Groceries", rate: 2, type: "cashback", cap: 2500, note: "2% at grocery stores and wholesale clubs up to $2,500/quarter" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 after $1,000 in 90 days",
    perks: [
      "Preferred Rewards members earn 25-75% more cash back",
      "0% intro APR for 15 billing cycles",
    ],
  },
  {
    id: "boa-premium-rewards",
    name: "Bank of America Premium Rewards",
    issuer: "Bank of America",
    network: "visa",
    annualFee: 95,
    rewards: [
      {
        category: "Dining",
        rate: 3.5,
        type: "points",
        pointValue: 1.0,
        note: "3.5% with Preferred Rewards Platinum Honors (base 2%)",
      },
      {
        category: "Travel",
        rate: 3.5,
        type: "points",
        pointValue: 1.0,
        note: "3.5% with Preferred Rewards Platinum Honors (base 2%)",
      },
      {
        category: null,
        rate: 2.625,
        type: "points",
        pointValue: 1.0,
        note: "2.625% with Preferred Rewards Platinum Honors (base 1.5%)",
      },
    ],
    signupBonus: "60,000 points after $4,000 in 90 days",
    perks: [
      "$100 airline incidental credit",
      "Global Entry / TSA PreCheck credit",
      "Preferred Rewards bonus of 25-75%",
    ],
  },
  {
    id: "boa-unlimited-cash",
    name: "Bank of America Unlimited Cash Rewards",
    issuer: "Bank of America",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: null, rate: 1.5, type: "cashback" },
    ],
    signupBonus: "$200 after $1,000 in 90 days",
    perks: [
      "Preferred Rewards members earn 25-75% more cash back",
      "0% intro APR for 15 billing cycles",
    ],
  },

  // =========================================================================
  // US BANK
  // =========================================================================
  {
    id: "us-bank-altitude-go",
    name: "US Bank Altitude Go",
    issuer: "US Bank",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: "Dining", rate: 4, type: "points", pointValue: 1.0 },
      { category: "Groceries", rate: 2, type: "points", pointValue: 1.0 },
      { category: "Streaming", rate: 2, type: "points", pointValue: 1.0 },
      { category: "Gas", rate: 2, type: "points", pointValue: 1.0 },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "20,000 points after $1,000 in 90 days",
    perks: [
      "No annual fee",
      "No foreign transaction fees",
      "Streaming credits",
    ],
  },
  {
    id: "us-bank-cash-plus",
    name: "US Bank Cash+",
    issuer: "US Bank",
    network: "visa",
    annualFee: 0,
    rewards: [
      {
        category: "Utilities",
        rate: 5,
        type: "cashback",
        cap: 2000,
        note: "5% on two categories you choose each quarter (up to $2,000 combined per quarter)",
      },
      {
        category: "Electronics",
        rate: 5,
        type: "cashback",
        cap: 2000,
        note: "5% on two categories you choose each quarter (up to $2,000 combined per quarter)",
      },
      {
        category: "Dining",
        rate: 2,
        type: "cashback",
        note: "2% on one everyday category you choose",
      },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$200 after $1,000 in 120 days",
    perks: [
      "No annual fee",
      "0% intro APR for 15 billing cycles on purchases and balance transfers",
    ],
  },

  // =========================================================================
  // APPLE
  // =========================================================================
  {
    id: "apple-card",
    name: "Apple Card",
    issuer: "Apple / Goldman Sachs",
    network: "mastercard",
    annualFee: 0,
    rewards: [
      { category: null, merchantName: "Apple", rate: 3, type: "cashback" },
      { category: null, merchantName: "Uber", rate: 3, type: "cashback" },
      { category: null, merchantName: "Uber Eats", rate: 3, type: "cashback" },
      { category: null, merchantName: "Walgreens", rate: 3, type: "cashback" },
      { category: null, merchantName: "T-Mobile", rate: 3, type: "cashback" },
      { category: null, merchantName: "Nike", rate: 3, type: "cashback" },
      { category: null, merchantName: "Panera", rate: 3, type: "cashback" },
      { category: null, merchantName: "Exxon", rate: 3, type: "cashback" },
      { category: null, merchantName: "ExxonMobil", rate: 3, type: "cashback" },
      {
        category: "Apple Pay",
        rate: 2,
        type: "cashback",
        note: "2% on all Apple Pay purchases",
      },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "Up to 3% Daily Cash on purchases from day one",
    perks: [
      "Daily Cash deposited daily",
      "No fees (no annual, late, international, or over-limit fees)",
      "Titanium card design",
    ],
  },

  // =========================================================================
  // COSTCO
  // =========================================================================
  {
    id: "costco-anywhere-visa",
    name: "Costco Anywhere Visa by Citi",
    issuer: "Citi",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: "Gas", rate: 4, type: "cashback", cap: 7000, note: "4% on gas worldwide (up to $7,000/year)" },
      { category: "Dining", rate: 3, type: "cashback" },
      { category: "Travel", rate: 3, type: "cashback" },
      { category: null, merchantName: "Costco", rate: 2, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "None",
    perks: [
      "Requires Costco membership",
      "No foreign transaction fees",
      "Worldwide car rental insurance",
      "Damage & theft purchase protection",
    ],
  },

  // =========================================================================
  // TARGET
  // =========================================================================
  {
    id: "target-redcard-credit",
    name: "Target RedCard Credit",
    issuer: "Target / TD Bank",
    network: "other",
    annualFee: 0,
    rewards: [
      { category: null, merchantName: "Target", rate: 5, type: "cashback" },
      { category: null, merchantName: "Target.com", rate: 5, type: "cashback" },
    ],
    signupBonus: "None",
    perks: [
      "Free shipping on Target.com",
      "Extra 30 days for returns",
      "Only usable at Target stores and Target.com",
    ],
  },

  // =========================================================================
  // WALMART
  // =========================================================================
  {
    id: "walmart-rewards-card",
    name: "Capital One Walmart Rewards Card",
    issuer: "Capital One",
    network: "mastercard",
    annualFee: 0,
    rewards: [
      { category: null, merchantName: "Walmart.com", rate: 5, type: "cashback", note: "5% at Walmart.com" },
      { category: null, merchantName: "Walmart", rate: 2, type: "cashback" },
      { category: "Dining", rate: 2, type: "cashback" },
      { category: "Travel", rate: 2, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "5% back on in-store Walmart purchases for first 12 months with Walmart Pay",
    perks: [
      "No annual fee",
      "Special financing on Walmart purchases",
    ],
  },

  // =========================================================================
  // ADDITIONAL POPULAR CARDS
  // =========================================================================
  {
    id: "chase-ink-business-cash",
    name: "Chase Ink Business Cash",
    issuer: "Chase",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: "Office Supplies", rate: 5, type: "cashback", cap: 25000 },
      { category: "Internet", rate: 5, type: "cashback", cap: 25000 },
      { category: "Phone", rate: 5, type: "cashback", cap: 25000 },
      { category: "Gas", rate: 2, type: "cashback", cap: 25000 },
      { category: "Dining", rate: 2, type: "cashback", cap: 25000 },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$750 after $6,000 in 3 months",
    perks: ["No annual fee", "Employee cards at no additional cost"],
  },
  {
    id: "chase-ink-business-unlimited",
    name: "Chase Ink Business Unlimited",
    issuer: "Chase",
    network: "visa",
    annualFee: 0,
    rewards: [
      { category: null, rate: 1.5, type: "cashback" },
    ],
    signupBonus: "$750 after $6,000 in 3 months",
    perks: ["No annual fee", "0% intro APR for 12 months on purchases"],
  },
  {
    id: "amex-business-gold",
    name: "Amex Business Gold Card",
    issuer: "Amex",
    network: "amex",
    annualFee: 375,
    rewards: [
      {
        category: "Flights",
        rate: 4,
        type: "points",
        pointValue: 1.0,
        cap: 150000,
        note: "4x on the 2 categories where you spend the most each month (up to $150,000/year combined)",
      },
      { category: "Advertising", rate: 4, type: "points", pointValue: 1.0, cap: 150000 },
      { category: "Gas", rate: 4, type: "points", pointValue: 1.0, cap: 150000 },
      { category: "Shipping", rate: 4, type: "points", pointValue: 1.0, cap: 150000 },
      { category: "Technology", rate: 4, type: "points", pointValue: 1.0, cap: 150000 },
      { category: "Dining", rate: 4, type: "points", pointValue: 1.0, cap: 150000 },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "70,000 points after $10,000 in 3 months",
    perks: [
      "Flexible spending limits",
      "25% airline bonus when booking through Amex Travel",
      "No foreign transaction fees",
    ],
  },
  {
    id: "capital-one-savor",
    name: "Capital One Savor",
    issuer: "Capital One",
    network: "visa",
    annualFee: 95,
    rewards: [
      { category: "Dining", rate: 4, type: "cashback" },
      { category: "Entertainment", rate: 4, type: "cashback" },
      { category: "Groceries", rate: 3, type: "cashback" },
      { category: "Streaming", rate: 4, type: "cashback" },
      { category: null, rate: 1, type: "cashback" },
    ],
    signupBonus: "$300 after $3,000 in 3 months",
    perks: [
      "No foreign transaction fees",
      "Uber statement credits",
    ],
  },
  {
    id: "amex-hilton-honors",
    name: "Hilton Honors American Express Card",
    issuer: "Amex",
    network: "amex",
    annualFee: 0,
    rewards: [
      { category: null, merchantName: "Hilton", rate: 7, type: "points", pointValue: 0.5, note: "7x on Hilton purchases" },
      { category: "Dining", rate: 5, type: "points", pointValue: 0.5 },
      { category: "Groceries", rate: 5, type: "points", pointValue: 0.5 },
      { category: "Gas", rate: 5, type: "points", pointValue: 0.5 },
      { category: null, rate: 3, type: "points", pointValue: 0.5 },
    ],
    signupBonus: "80,000 Hilton Honors points after $2,000 in 6 months",
    perks: ["No annual fee", "Hilton Honors Silver status"],
  },
  {
    id: "amex-marriott-bonvoy",
    name: "Marriott Bonvoy Amex",
    issuer: "Amex",
    network: "amex",
    annualFee: 185,
    rewards: [
      { category: null, merchantName: "Marriott", rate: 6, type: "points", pointValue: 0.7, note: "6x on Marriott purchases" },
      { category: "Dining", rate: 4, type: "points", pointValue: 0.7 },
      { category: "Groceries", rate: 4, type: "points", pointValue: 0.7 },
      { category: "Gas", rate: 4, type: "points", pointValue: 0.7 },
      { category: null, rate: 2, type: "points", pointValue: 0.7 },
    ],
    signupBonus: "85,000 Marriott Bonvoy points after $4,000 in 6 months",
    perks: [
      "Marriott Bonvoy Gold status",
      "1 free night award each card anniversary (up to 35,000 points value)",
      "15 elite night credits annually",
    ],
  },
  {
    id: "citi-strata-premier",
    name: "Citi Strata Premier",
    issuer: "Citi",
    network: "mastercard",
    annualFee: 95,
    rewards: [
      { category: "Flights", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Hotels", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Dining", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Groceries", rate: 3, type: "points", pointValue: 1.0 },
      { category: "Gas", rate: 3, type: "points", pointValue: 1.0 },
      { category: "EV Charging", rate: 3, type: "points", pointValue: 1.0 },
      { category: null, rate: 1, type: "points", pointValue: 1.0 },
    ],
    signupBonus: "75,000 ThankYou points after $4,000 in 3 months",
    perks: [
      "$100 annual hotel savings benefit",
      "No foreign transaction fees",
      "Transfer partners",
    ],
  },
];

// ---------------------------------------------------------------------------
// 2. MERCHANT_CATEGORIES
// ---------------------------------------------------------------------------

export const MERCHANT_CATEGORIES: Record<string, string> = {
  // --- Groceries ---
  "Whole Foods": "Groceries",
  "Whole Foods Market": "Groceries",
  "Trader Joe's": "Groceries",
  "Trader Joes": "Groceries",
  Kroger: "Groceries",
  Publix: "Groceries",
  Safeway: "Groceries",
  Aldi: "Groceries",
  "ALDI": "Groceries",
  HEB: "Groceries",
  "H-E-B": "Groceries",
  Wegmans: "Groceries",
  "Sprouts": "Groceries",
  "Sprouts Farmers Market": "Groceries",
  "Harris Teeter": "Groceries",
  "Meijer": "Groceries",
  "Stop & Shop": "Groceries",
  "Giant": "Groceries",
  "Giant Eagle": "Groceries",
  "Food Lion": "Groceries",
  "ShopRite": "Groceries",
  "WinCo": "Groceries",
  "WinCo Foods": "Groceries",
  "Piggly Wiggly": "Groceries",
  "Albertsons": "Groceries",
  "Vons": "Groceries",
  "Jewel-Osco": "Groceries",
  "Fred Meyer": "Groceries",
  "Ralphs": "Groceries",
  "Fry's Food": "Groceries",
  "King Soopers": "Groceries",
  "Lidl": "Groceries",
  "Fresh Market": "Groceries",
  "The Fresh Market": "Groceries",
  "Market Basket": "Groceries",
  "Raley's": "Groceries",
  "Hannaford": "Groceries",
  "Big Y": "Groceries",
  "Instacart": "Groceries",

  // --- Dining / Restaurants ---
  "McDonald's": "Dining",
  McDonalds: "Dining",
  Starbucks: "Dining",
  Chipotle: "Dining",
  "Chipotle Mexican Grill": "Dining",
  "Olive Garden": "Dining",
  "Panera": "Dining",
  "Panera Bread": "Dining",
  "Chick-fil-A": "Dining",
  "Chick Fil A": "Dining",
  "Taco Bell": "Dining",
  "Burger King": "Dining",
  Wendys: "Dining",
  "Wendy's": "Dining",
  "Subway": "Dining",
  "Dominos": "Dining",
  "Domino's": "Dining",
  "Pizza Hut": "Dining",
  "Papa John's": "Dining",
  "Papa Johns": "Dining",
  "Five Guys": "Dining",
  "Shake Shack": "Dining",
  "Popeyes": "Dining",
  "Panda Express": "Dining",
  "Chili's": "Dining",
  "Applebee's": "Dining",
  "Denny's": "Dining",
  IHOP: "Dining",
  "Cracker Barrel": "Dining",
  "Cheesecake Factory": "Dining",
  "The Cheesecake Factory": "Dining",
  "Red Lobster": "Dining",
  "Outback Steakhouse": "Dining",
  "Texas Roadhouse": "Dining",
  "Buffalo Wild Wings": "Dining",
  "Wingstop": "Dining",
  "Raising Cane's": "Dining",
  "In-N-Out": "Dining",
  "In-N-Out Burger": "Dining",
  "Whataburger": "Dining",
  "Sonic": "Dining",
  "Sonic Drive-In": "Dining",
  "Jack in the Box": "Dining",
  "Arby's": "Dining",
  "KFC": "Dining",
  "Long John Silver's": "Dining",
  "Zaxby's": "Dining",
  "Noodles & Company": "Dining",
  "Sweetgreen": "Dining",
  "Cava": "Dining",
  "Wawa": "Dining",
  "Dunkin'": "Dining",
  "Dunkin Donuts": "Dining",
  "Tim Hortons": "Dining",
  "Dutch Bros": "Dining",

  // --- Food Delivery ---
  DoorDash: "Dining",
  "Uber Eats": "Dining",
  Grubhub: "Dining",
  Postmates: "Dining",
  Seamless: "Dining",
  "Caviar": "Dining",

  // --- Gas Stations ---
  Shell: "Gas",
  Chevron: "Gas",
  BP: "Gas",
  Exxon: "Gas",
  ExxonMobil: "Gas",
  "Costco Gas": "Gas",
  "Costco Gasoline": "Gas",
  Mobil: "Gas",
  Texaco: "Gas",
  Sunoco: "Gas",
  "Marathon": "Gas",
  "Phillips 66": "Gas",
  Valero: "Gas",
  "Circle K": "Gas",
  "7-Eleven": "Gas",
  "QuikTrip": "Gas",
  "QT": "Gas",
  "Sheetz": "Gas",
  "Casey's": "Gas",
  "Casey's General Store": "Gas",
  "RaceTrac": "Gas",
  "Murphy USA": "Gas",
  "Sam's Club Gas": "Gas",
  "BJ's Gas": "Gas",
  "Speedway": "Gas",
  "ARCO": "Gas",
  "Sinclair": "Gas",
  "Conoco": "Gas",
  "Gulf": "Gas",
  "Pilot": "Gas",
  "Pilot Flying J": "Gas",
  "Love's": "Gas",
  "Love's Travel Stops": "Gas",
  "Buc-ee's": "Gas",

  // --- Travel: Airlines ---
  "Delta Air Lines": "Flights",
  "Delta": "Flights",
  "United Airlines": "Flights",
  "United": "Flights",
  "American Airlines": "Flights",
  "Southwest Airlines": "Flights",
  "Southwest": "Flights",
  "JetBlue": "Flights",
  "Spirit Airlines": "Flights",
  "Spirit": "Flights",
  "Frontier Airlines": "Flights",
  "Frontier": "Flights",
  "Alaska Airlines": "Flights",
  "Hawaiian Airlines": "Flights",
  "Sun Country": "Flights",
  "Allegiant Air": "Flights",

  // --- Travel: Hotels ---
  "Marriott": "Hotels",
  "Hilton": "Hotels",
  "Hyatt": "Hotels",
  "IHG": "Hotels",
  "Holiday Inn": "Hotels",
  "Hampton Inn": "Hotels",
  "Best Western": "Hotels",
  "Wyndham": "Hotels",
  "Courtyard by Marriott": "Hotels",
  "Four Seasons": "Hotels",
  "Ritz-Carlton": "Hotels",
  "Westin": "Hotels",
  "Sheraton": "Hotels",
  "W Hotels": "Hotels",
  "Airbnb": "Travel",
  "VRBO": "Travel",

  // --- Travel: Car Rental ---
  "Hertz": "Travel",
  "Enterprise": "Travel",
  "Avis": "Travel",
  "Budget": "Travel",
  "National Car Rental": "Travel",
  "Turo": "Travel",

  // --- Transit / Rideshare ---
  Uber: "Transit",
  Lyft: "Transit",
  "MTA": "Transit",
  "BART": "Transit",
  "Caltrain": "Transit",
  "WMATA": "Transit",
  "Metro": "Transit",
  "CTA": "Transit",
  "MBTA": "Transit",
  "NJ Transit": "Transit",
  "Amtrak": "Transit",
  "Greyhound": "Transit",
  "Lime": "Transit",
  "Bird": "Transit",
  "Citi Bike": "Transit",

  // --- Streaming ---
  Netflix: "Streaming",
  Spotify: "Streaming",
  "Spotify Premium": "Streaming",
  Hulu: "Streaming",
  "Disney+": "Streaming",
  "Disney Plus": "Streaming",
  "HBO Max": "Streaming",
  Max: "Streaming",
  "Apple TV+": "Streaming",
  "Apple TV Plus": "Streaming",
  "YouTube Premium": "Streaming",
  "YouTube TV": "Streaming",
  "Amazon Prime Video": "Streaming",
  "Prime Video": "Streaming",
  "Peacock": "Streaming",
  "Paramount+": "Streaming",
  "Paramount Plus": "Streaming",
  "Crunchyroll": "Streaming",
  "Apple Music": "Streaming",
  "Tidal": "Streaming",
  "Amazon Music": "Streaming",
  "Audible": "Streaming",
  "SiriusXM": "Streaming",

  // --- Shopping ---
  Amazon: "Shopping",
  "Amazon.com": "Shopping",
  Walmart: "Shopping",
  "Walmart.com": "Shopping",
  Target: "Shopping",
  "Target.com": "Shopping",
  Costco: "Groceries",
  "Sam's Club": "Shopping",
  "BJ's Wholesale": "Shopping",
  "Best Buy": "Shopping",
  "Home Depot": "Shopping",
  "The Home Depot": "Shopping",
  "Lowe's": "Shopping",
  Lowes: "Shopping",
  IKEA: "Shopping",
  "Bed Bath & Beyond": "Shopping",
  "Crate & Barrel": "Shopping",
  "Pottery Barn": "Shopping",
  "Williams Sonoma": "Shopping",
  "West Elm": "Shopping",
  "Wayfair": "Shopping",
  "Etsy": "Shopping",
  "eBay": "Shopping",
  "Nordstrom": "Shopping",
  "Macy's": "Shopping",
  Macys: "Shopping",
  "Bloomingdale's": "Shopping",
  "Neiman Marcus": "Shopping",
  "Saks Fifth Avenue": "Shopping",
  "TJ Maxx": "Shopping",
  "TJMaxx": "Shopping",
  "Marshalls": "Shopping",
  "Ross": "Shopping",
  "Burlington": "Shopping",
  "Old Navy": "Shopping",
  "Gap": "Shopping",
  "Banana Republic": "Shopping",
  "Nike": "Shopping",
  "Adidas": "Shopping",
  "Under Armour": "Shopping",
  "Lululemon": "Shopping",
  "REI": "Shopping",
  "Dick's Sporting Goods": "Shopping",
  "Academy Sports": "Shopping",
  "GameStop": "Shopping",
  "Barnes & Noble": "Shopping",
  "Apple": "Shopping",
  "Apple Store": "Shopping",
  "Microsoft Store": "Shopping",
  "Staples": "Shopping",
  "Office Depot": "Shopping",
  "OfficeMax": "Shopping",
  "Costco.com": "Shopping",
  "Zappos": "Shopping",
  "Overstock": "Shopping",
  "Zara": "Shopping",
  "H&M": "Shopping",
  "Uniqlo": "Shopping",
  "Forever 21": "Shopping",
  "Anthropologie": "Shopping",
  "Free People": "Shopping",
  "Urban Outfitters": "Shopping",
  "Sephora": "Shopping",
  "Ulta": "Shopping",
  "Ulta Beauty": "Shopping",
  "Bath & Body Works": "Shopping",
  "Victoria's Secret": "Shopping",
  "PetSmart": "Shopping",
  "Petco": "Shopping",
  "Chewy": "Shopping",
  "Dollar Tree": "Shopping",
  "Dollar General": "Shopping",
  "Five Below": "Shopping",
  "Michaels": "Shopping",
  "Hobby Lobby": "Shopping",
  "Joann": "Shopping",
  "Temu": "Shopping",
  "Shein": "Shopping",
  "Wish": "Shopping",
  "AliExpress": "Shopping",

  // --- Entertainment ---
  AMC: "Entertainment",
  "AMC Theatres": "Entertainment",
  Regal: "Entertainment",
  "Regal Cinemas": "Entertainment",
  Cinemark: "Entertainment",
  Ticketmaster: "Entertainment",
  "Live Nation": "Entertainment",
  "StubHub": "Entertainment",
  "SeatGeek": "Entertainment",
  "Fandango": "Entertainment",
  "Dave & Buster's": "Entertainment",
  "TopGolf": "Entertainment",
  "Bowlero": "Entertainment",
  "Six Flags": "Entertainment",
  "Cedar Point": "Entertainment",
  "Universal Studios": "Entertainment",
  "Disneyland": "Entertainment",
  "Walt Disney World": "Entertainment",
  "SeaWorld": "Entertainment",
  "Legoland": "Entertainment",

  // --- Drugstores / Pharmacy ---
  CVS: "Drugstores",
  "CVS Pharmacy": "Drugstores",
  Walgreens: "Drugstores",
  "Rite Aid": "Drugstores",

  // --- Phone / Telecom ---
  "AT&T": "Phone",
  "T-Mobile": "Phone",
  Verizon: "Phone",
  "US Cellular": "Phone",
  "Mint Mobile": "Phone",
  "Cricket Wireless": "Phone",
  "Metro by T-Mobile": "Phone",
  "Visible": "Phone",
  "Google Fi": "Phone",
  "Xfinity Mobile": "Phone",

  // --- Internet / Cable ---
  "Comcast": "Internet",
  "Xfinity": "Internet",
  "Spectrum": "Internet",
  "Cox": "Internet",
  "AT&T Internet": "Internet",
  "Verizon Fios": "Internet",
  "CenturyLink": "Internet",
  "Frontier Internet": "Internet",
  "Google Fiber": "Internet",
  "Starlink": "Internet",

  // --- Utilities ---
  "Con Edison": "Utilities",
  "PG&E": "Utilities",
  "Duke Energy": "Utilities",
  "Southern California Edison": "Utilities",
  "National Grid": "Utilities",
  "Florida Power & Light": "Utilities",

  // --- Fitness ---
  "Planet Fitness": "Fitness",
  "LA Fitness": "Fitness",
  "Equinox": "Fitness",
  "24 Hour Fitness": "Fitness",
  "Orangetheory": "Fitness",
  "Orangetheory Fitness": "Fitness",
  "CrossFit": "Fitness",
  "SoulCycle": "Fitness",
  "Peloton": "Fitness",
  "YMCA": "Fitness",
  "Gold's Gym": "Fitness",
  "Anytime Fitness": "Fitness",
  "F45": "Fitness",
  "Barry's": "Fitness",
  "ClassPass": "Fitness",

  // --- Insurance ---
  "Geico": "Insurance",
  "State Farm": "Insurance",
  "Progressive": "Insurance",
  "Allstate": "Insurance",
  "USAA": "Insurance",
  "Liberty Mutual": "Insurance",
  "Nationwide": "Insurance",

  // --- PayPal / Venmo ---
  PayPal: "Shopping",
  Venmo: "Shopping",

  // --- EV Charging ---
  "ChargePoint": "EV Charging",
  "Tesla Supercharger": "EV Charging",
  "Electrify America": "EV Charging",
  "EVgo": "EV Charging",
  "Blink Charging": "EV Charging",
};

// ---------------------------------------------------------------------------
// Helper: Build a normalized lookup map for fast fuzzy matching
// ---------------------------------------------------------------------------

const _normalizedCategoryMap: Map<string, string> = new Map();

function _normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Populate the lookup map once on module load
for (const [merchant, category] of Object.entries(MERCHANT_CATEGORIES)) {
  _normalizedCategoryMap.set(_normalize(merchant), category);
}

// Build a card lookup map once
const _cardMap: Map<string, CardTemplate> = new Map();
for (const card of CARD_DATABASE) {
  _cardMap.set(card.id, card);
}

// ---------------------------------------------------------------------------
// 3. getCardCategory
// ---------------------------------------------------------------------------

/**
 * Look up a merchant's reward category with fuzzy matching.
 *
 * 1. Exact (case-insensitive, punctuation-normalized) match
 * 2. Substring match (e.g. "Trader Joe's #123" matches "Trader Joe's")
 * 3. Token overlap match (best overlap wins)
 * 4. Falls back to "Shopping" if nothing matches
 */
export function getCardCategory(merchantName: string): string {
  if (!merchantName) return "Shopping";

  const normalized = _normalize(merchantName);

  // 1. Exact match
  const exact = _normalizedCategoryMap.get(normalized);
  if (exact) return exact;

  // 2. Substring match — check if any known merchant name is contained
  //    within the input or vice versa (handles store numbers, etc.)
  let bestSubstringMatch: { key: string; category: string; length: number } | null = null;
  for (const [key, category] of _normalizedCategoryMap) {
    if (normalized.includes(key) || key.includes(normalized)) {
      if (!bestSubstringMatch || key.length > bestSubstringMatch.length) {
        bestSubstringMatch = { key, category, length: key.length };
      }
    }
  }
  if (bestSubstringMatch) return bestSubstringMatch.category;

  // 3. Token overlap — split both into words and find best overlap
  const inputTokens = new Set(normalized.split(" ").filter((t) => t.length > 1));
  if (inputTokens.size === 0) return "Shopping";

  let bestOverlap = 0;
  let bestCategory = "Shopping";

  for (const [key, category] of _normalizedCategoryMap) {
    const keyTokens = key.split(" ").filter((t) => t.length > 1);
    if (keyTokens.length === 0) continue;

    let overlap = 0;
    for (const token of keyTokens) {
      if (inputTokens.has(token)) overlap++;
    }

    const score = overlap / Math.max(keyTokens.length, inputTokens.size);
    if (score > bestOverlap && score >= 0.5) {
      bestOverlap = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// ---------------------------------------------------------------------------
// 4. calculateReward
// ---------------------------------------------------------------------------

export interface RewardResult {
  points: number;
  cashValue: number; // in dollars
  rate: number; // effective percentage back
}

/**
 * Calculate the reward earned for a specific card + purchase.
 *
 * Resolution order:
 * 1. Merchant-specific bonus (e.g., 5% at Amazon for Amazon Prime Visa)
 * 2. Category bonus (e.g., 3% Dining for Chase Sapphire Preferred)
 * 3. Base rate (category = null)
 */
export function calculateReward(
  cardId: string,
  amount: number,
  merchantName: string
): RewardResult {
  const card = _cardMap.get(cardId);
  if (!card) {
    return { points: 0, cashValue: 0, rate: 0 };
  }

  const category = getCardCategory(merchantName);
  const normalizedMerchant = _normalize(merchantName);

  let bestRate = 0;
  let matchedReward: CardReward | null = null;

  for (const reward of card.rewards) {
    let matches = false;
    let priority = 0;

    // Priority 1: Merchant-specific match
    if (reward.merchantName) {
      const normalizedRewardMerchant = _normalize(reward.merchantName);
      if (
        normalizedMerchant === normalizedRewardMerchant ||
        normalizedMerchant.includes(normalizedRewardMerchant) ||
        normalizedRewardMerchant.includes(normalizedMerchant)
      ) {
        matches = true;
        priority = 3;
      }
    }

    // Priority 2: Category match
    if (!matches && reward.category && reward.category !== "Rotating" && reward.category !== "Apple Pay") {
      if (reward.category.toLowerCase() === category.toLowerCase()) {
        matches = true;
        priority = 2;
      }
      // Also check if the merchant category is a sub-type (e.g., "Flights" matches "Travel")
      if (!matches && _isCategoryMatch(category, reward.category)) {
        matches = true;
        priority = 1;
      }
    }

    // Priority 0: Base rate (category is null, no merchantName)
    if (!matches && reward.category === null && !reward.merchantName) {
      matches = true;
      priority = 0;
    }

    if (matches) {
      // Use priority first, then rate to break ties
      const currentPriority = matchedReward
        ? _getMatchPriority(matchedReward, normalizedMerchant, category)
        : -1;

      if (priority > currentPriority || (priority === currentPriority && reward.rate > bestRate)) {
        bestRate = reward.rate;
        matchedReward = reward;
      }
    }
  }

  if (!matchedReward) {
    return { points: 0, cashValue: 0, rate: 0 };
  }

  const rewardAmount = (amount * bestRate) / 100;

  if (matchedReward.type === "cashback") {
    return {
      points: 0,
      cashValue: rewardAmount,
      rate: bestRate,
    };
  }

  // Points or miles
  const pointValue = matchedReward.pointValue ?? 1.0;
  const points = rewardAmount * 100; // convert dollar amount to points (1 point per cent)
  // Actually: rate% * amount = dollar reward equivalent. For points cards, points = rate * amount (1x = 1 point per dollar)
  const earnedPoints = (bestRate * amount) / 100 * 100; // e.g., 3% of $100 = 3 * 100 = 300 points
  // Simpler: earnedPoints = rate * amount (e.g., 3x on $100 = 300 points)
  const correctedPoints = bestRate * amount; // 3x earn on $100 = 300 points

  return {
    points: Math.round(correctedPoints),
    cashValue: Math.round((correctedPoints * pointValue) / 100 * 100) / 100, // points * cents_per_point / 100 = dollars
    rate: bestRate,
  };
}

/**
 * Check if a merchant category is a logical sub-type of a reward category.
 * E.g. "Flights" and "Hotels" are sub-types of "Travel".
 */
function _isCategoryMatch(merchantCategory: string, rewardCategory: string): boolean {
  const travelSubTypes = ["flights", "hotels", "transit", "car rental"];
  const mc = merchantCategory.toLowerCase();
  const rc = rewardCategory.toLowerCase();

  if (rc === "travel" && travelSubTypes.includes(mc)) return true;
  if (rc === "transportation" && (mc === "transit" || mc === "gas")) return true;

  return false;
}

function _getMatchPriority(
  reward: CardReward,
  normalizedMerchant: string,
  category: string
): number {
  if (reward.merchantName) {
    const nm = _normalize(reward.merchantName);
    if (normalizedMerchant === nm || normalizedMerchant.includes(nm) || nm.includes(normalizedMerchant)) {
      return 3;
    }
  }
  if (reward.category && reward.category.toLowerCase() === category.toLowerCase()) return 2;
  if (reward.category && _isCategoryMatch(category, reward.category)) return 1;
  if (reward.category === null && !reward.merchantName) return 0;
  return -1;
}

// ---------------------------------------------------------------------------
// 5. findBestCard
// ---------------------------------------------------------------------------

export interface BestCardResult {
  cardId: string;
  reward: number; // cash value in dollars
  rate: number; // effective rate
}

/**
 * Given a user's wallet (array of card IDs), find the optimal card for a purchase.
 */
export function findBestCard(
  cards: string[],
  amount: number,
  merchantName: string
): BestCardResult {
  let best: BestCardResult = { cardId: "", reward: 0, rate: 0 };

  for (const cardId of cards) {
    const result = calculateReward(cardId, amount, merchantName);
    const cashValue = result.cashValue || 0;

    if (cashValue > best.reward) {
      best = {
        cardId,
        reward: Math.round(cashValue * 100) / 100,
        rate: result.rate,
      };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

/** Get a card template by ID. */
export function getCard(cardId: string): CardTemplate | undefined {
  return _cardMap.get(cardId);
}

/** List all card IDs. */
export function getAllCardIds(): string[] {
  return CARD_DATABASE.map((c) => c.id);
}

/** List all unique categories from the merchant map. */
export function getAllCategories(): string[] {
  return [...new Set(Object.values(MERCHANT_CATEGORIES))].sort();
}

/** Search cards by issuer. */
export function getCardsByIssuer(issuer: string): CardTemplate[] {
  return CARD_DATABASE.filter(
    (c) => c.issuer.toLowerCase() === issuer.toLowerCase()
  );
}
