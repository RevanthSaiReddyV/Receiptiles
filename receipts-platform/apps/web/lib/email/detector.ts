export interface DetectedRetailer {
  id: string;
  name: string;
  category: string;
}

const RETAILER_PATTERNS: Array<{
  retailer: DetectedRetailer;
  senders: string[];
  subjectPatterns?: RegExp[];
}> = [
  {
    retailer: { id: "amazon", name: "Amazon", category: "Shopping" },
    senders: [
      "auto-confirm@amazon.com",
      "ship-confirm@amazon.com",
      "order-update@amazon.com",
      "digital-no-reply@amazon.com",
      "no-reply@amazon.com",
    ],
    subjectPatterns: [/your.*order/i, /order confirmation/i, /delivery/i, /^ordered:/i, /shipped:/i],
  },
  {
    retailer: { id: "walmart", name: "Walmart", category: "Shopping" },
    senders: [
      "help@walmart.com",
      "no-reply@walmart.com",
      "noreply@walmart.com",
      "orders@walmart.com",
    ],
    subjectPatterns: [/order.*confirm/i, /your.*order/i, /ready for pickup/i],
  },
  {
    retailer: { id: "target", name: "Target", category: "Shopping" },
    senders: [
      "target@em.target.com",
      "order@em.target.com",
      "noreply@target.com",
    ],
    subjectPatterns: [/order.*confirm/i, /your.*order/i, /ready for pickup/i],
  },
  {
    retailer: { id: "costco", name: "Costco", category: "Shopping" },
    senders: ["noreply@costco.com", "customerservice@costco.com"],
    subjectPatterns: [/order.*confirm/i, /your.*order/i],
  },
  {
    retailer: { id: "instacart", name: "Instacart", category: "Groceries" },
    senders: ["no-reply@instacart.com", "receipts@instacart.com"],
    subjectPatterns: [/receipt/i, /order.*delivered/i, /your.*delivery/i],
  },
  {
    retailer: { id: "doordash", name: "DoorDash", category: "Dining" },
    senders: ["no-reply@doordash.com", "noreply@doordash.com"],
    subjectPatterns: [/receipt/i, /order.*confirm/i],
  },
  {
    retailer: { id: "ubereats", name: "Uber Eats", category: "Dining" },
    senders: ["uber.us@uber.com", "noreply@uber.com"],
    subjectPatterns: [/receipt/i, /trip.*with uber eats/i],
  },
  {
    retailer: { id: "grubhub", name: "Grubhub", category: "Dining" },
    senders: ["noreply@grubhub.com", "no-reply@eat.grubhub.com"],
    subjectPatterns: [/receipt/i, /order.*confirm/i],
  },
  {
    retailer: { id: "uber", name: "Uber", category: "Transportation" },
    senders: ["uber.us@uber.com", "noreply@uber.com"],
    subjectPatterns: [/trip.*receipt/i, /your.*trip/i],
  },
  {
    retailer: { id: "lyft", name: "Lyft", category: "Transportation" },
    senders: ["no-reply@lyft.com", "ride-receipts@lyft.com"],
    subjectPatterns: [/ride.*receipt/i, /your.*ride/i],
  },
  {
    retailer: { id: "apple", name: "Apple", category: "Shopping" },
    senders: ["no_reply@email.apple.com", "noreply@email.apple.com"],
    subjectPatterns: [/receipt/i, /invoice/i, /your.*purchase/i],
  },
  {
    retailer: { id: "bestbuy", name: "Best Buy", category: "Electronics" },
    senders: ["BestBuyInfo@emailinfo.bestbuy.com", "noreply@bestbuy.com"],
    subjectPatterns: [/order.*confirm/i, /your.*order/i],
  },
  {
    retailer: { id: "starbucks", name: "Starbucks", category: "Dining" },
    senders: ["noreply@starbucks.com", "info@starbucks.com"],
    subjectPatterns: [/receipt/i, /order.*ready/i],
  },
  {
    retailer: { id: "etsy", name: "Etsy", category: "Shopping" },
    senders: ["transaction@etsy.com", "noreply@etsy.com"],
    subjectPatterns: [/receipt/i, /order.*confirm/i],
  },
  {
    retailer: { id: "paypal", name: "PayPal", category: "Uncategorized" },
    senders: ["service@paypal.com", "member@paypal.com"],
    subjectPatterns: [/receipt/i, /you.*sent.*payment/i, /payment.*received/i],
  },
];

export function detectRetailer(
  senderEmail: string,
  subject: string
): DetectedRetailer | null {
  const sender = senderEmail.toLowerCase();

  for (const pattern of RETAILER_PATTERNS) {
    const senderMatch = pattern.senders.some(
      (s) => sender === s || sender.endsWith(`@${s.split("@")[1]}`)
    );

    if (!senderMatch) continue;

    if (pattern.subjectPatterns) {
      const subjectMatch = pattern.subjectPatterns.some((re) => re.test(subject));
      if (subjectMatch) return pattern.retailer;
    } else {
      return pattern.retailer;
    }
  }

  return null;
}

export function isReceiptEmail(senderEmail: string, subject: string): boolean {
  const rejectPatterns = /review|rate your|tell us about|meet your|ever wonder|you're onto|skill is now|updates to the|was used with|is expiring|summer menu|unsubscribe|delivery estimate|tracking update|out for delivery|has shipped|pull request|merge|commit|\[.*\/.*\]|github\.com|noreply@github/i;
  if (rejectPatterns.test(subject)) return false;
  if (senderEmail.includes("github.com") || senderEmail.includes("noreply@github")) return false;

  if (detectRetailer(senderEmail, subject)) return true;

  const receiptKeywords = /receipt|order confirm|invoice|payment confirm|your purchase|order #|^ordered:/i;
  return receiptKeywords.test(subject);
}
