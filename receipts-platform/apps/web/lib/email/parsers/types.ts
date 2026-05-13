export interface ParsedEmailReceipt {
  merchant: {
    rawName: string;
    canonicalName: string;
    category: string;
    location: string | null;
  };
  purchase: {
    purchasedAt: string;
    currency: string;
    subtotal: number;
    tax: number;
    tip: number;
    discount: number;
    fees: number;
    total: number;
  };
  payment: {
    method: string;
    cardLast4: string | null;
    walletType: string | null;
    entryMode: string | null;
  };
  items: Array<{
    rawName: string;
    name: string;
    description?: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: string;
    sku?: string;
    productUrl?: string;
  }>;
  metadata: {
    confidence: number;
    requiresReview: boolean;
  };
}

export interface EmailParser {
  id: string;
  canParse(senderEmail: string, subject: string): boolean;
  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null;
}
