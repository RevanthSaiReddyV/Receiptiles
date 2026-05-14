import type { ParsedEmailReceipt } from "./types";

interface BankTransaction {
  bank: string;
  amount: number;
  merchant: string;
  date: string;
  cardLast4: string | null;
  type: "purchase" | "refund" | "payment";
}

interface BankAlertPattern {
  bank: string;
  senders: string[];
  subjectPatterns: RegExp[];
  extractTransaction: (text: string, subject: string) => BankTransaction | null;
}

const BANK_PATTERNS: BankAlertPattern[] = [
  // Chase
  {
    bank: "Chase",
    senders: ["no.reply.alerts@chase.com", "alerts@chase.com"],
    subjectPatterns: [/transaction with.*chase/i, /alert.*chase/i, /your.*charge/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/(?:charge|transaction|purchase)\s+(?:of\s+)?\$?([\d,]+\.\d{2})/i) ??
        text.match(/\$([\d,]+\.\d{2})\s+(?:at|with|from)/i) ??
        subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+([A-Z][A-Z\s&'.\-]{2,40}?)(?:\s+on|\s+has|\.|$)/m) ??
        text.match(/merchant[:\s]+(.+?)(?:\n|$)/i);
      const cardMatch = text.match(/(?:ending\s*(?:in|with)\s*|card\s*)(\d{4})/i);
      const dateMatch = text.match(/(?:on|date)[:\s]*(\w{3,9}\.?\s+\d{1,2},?\s+\d{4})/i) ??
        text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Chase",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1] ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Amex
  {
    bank: "American Express",
    senders: ["alerts@aexp.com", "americanexpress@aexp.com", "no.reply@aexp.com"],
    subjectPatterns: [/large purchase/i, /transaction alert/i, /charge.*card/i, /amex.*alert/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+([A-Z][A-Z\s&'.\-]{2,40}?)(?:\s+on|\.|$)/m) ??
        text.match(/merchant[:\s]+(.+?)(?:\n|$)/i);
      const cardMatch = text.match(/(?:ending\s*(?:in|with)\s*|card\s*[-x]*)(\d{4,5})/i);
      const dateMatch = text.match(/(\w{3,9}\.?\s+\d{1,2},?\s+\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "American Express",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1]?.slice(-4) ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Bank of America
  {
    bank: "Bank of America",
    senders: ["onlinebanking@ealerts.bankofamerica.com", "alerts@bankofamerica.com"],
    subjectPatterns: [/credit card transaction/i, /debit card transaction/i, /purchase/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+(.+?)(?:\s+on|\s+in|\.|$)/im);
      const cardMatch = text.match(/(?:ending\s*in\s*)(\d{4})/i);
      const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/) ??
        text.match(/(\w{3,9}\s+\d{1,2},\s+\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Bank of America",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1] ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Capital One
  {
    bank: "Capital One",
    senders: ["alerts@capitalone.com", "noreply@capitalone.com", "no-reply@capitalone.com", "ealerts@capitalone.com"],
    subjectPatterns: [/transaction/i, /purchase/i, /charge/i, /card.*used/i, /was made/i, /capital one/i, /your.*account/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+(.+?)(?:\s+on|\s+was|\.|$)/im);
      const cardMatch = text.match(/(?:ending\s*in\s*)(\d{4})/i);
      const dateMatch = text.match(/(\w{3,9}\s+\d{1,2},\s+\d{4})/) ??
        text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Capital One",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1] ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Citi
  {
    bank: "Citi",
    senders: ["alerts@citibank.com", "alerts@citi.com"],
    subjectPatterns: [/transaction alert/i, /card.*transaction/i, /purchase.*made/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+(.+?)(?:\s+on|\.|$)/im);
      const cardMatch = text.match(/(?:ending\s*in\s*)(\d{4})/i);
      const dateMatch = text.match(/(\w{3,9}\s+\d{1,2},\s+\d{4})/) ??
        text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Citi",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1] ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Wells Fargo
  {
    bank: "Wells Fargo",
    senders: ["alerts@notify.wellsfargo.com", "wellsfargo@notify.wellsfargo.com"],
    subjectPatterns: [/transaction alert/i, /card transaction/i, /credit card.*purchase/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+(.+?)(?:\s+on|\.|$)/im);
      const cardMatch = text.match(/(?:ending\s*in\s*)(\d{4})/i);
      const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Wells Fargo",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1] ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Discover
  {
    bank: "Discover",
    senders: ["discover@service.discover.com", "alerts@discover.com"],
    subjectPatterns: [/transaction alert/i, /purchase notification/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+(.+?)(?:\s+on|\.|$)/im);
      const cardMatch = text.match(/(?:ending\s*in\s*)(\d{4})/i);
      const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Discover",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: cardMatch?.[1] ?? null,
        type: /refund|credit|return/i.test(text) ? "refund" : "purchase",
      };
    },
  },

  // Apple Card (Goldman Sachs)
  {
    bank: "Apple Card",
    senders: ["no-reply@apple.com", "noreply@email.apple.com"],
    subjectPatterns: [/transaction.*apple card/i, /daily cash/i],
    extractTransaction(text, subject) {
      const amountMatch = text.match(/\$([\d,]+\.\d{2})/) ?? subject.match(/\$([\d,]+\.\d{2})/);
      const merchantMatch = text.match(/(?:at|with|from)\s+(.+?)(?:\s+on|\.|$)/im);
      const dateMatch = text.match(/(\w{3,9}\s+\d{1,2},\s+\d{4})/);

      if (!amountMatch) return null;
      return {
        bank: "Apple Card",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        merchant: merchantMatch?.[1]?.trim() ?? "Unknown",
        date: dateMatch?.[1] ?? new Date().toISOString(),
        cardLast4: null,
        type: "purchase",
      };
    },
  },
];

/**
 * Check if an email is a bank transaction alert
 */
export function isBankAlert(senderEmail: string, subject: string): boolean {
  const sender = senderEmail.toLowerCase();
  return BANK_PATTERNS.some(
    p => p.senders.some(s => sender.includes(s.split("@")[1]!)) &&
      p.subjectPatterns.some(r => r.test(subject))
  );
}

/**
 * Parse a bank transaction alert email into a receipt-like structure
 */
export function parseBankAlert(
  senderEmail: string,
  subject: string,
  text: string
): ParsedEmailReceipt | null {
  const sender = senderEmail.toLowerCase();

  for (const pattern of BANK_PATTERNS) {
    const senderMatch = pattern.senders.some(s => sender.includes(s.split("@")[1]!));
    if (!senderMatch) continue;

    const subjectMatch = pattern.subjectPatterns.some(r => r.test(subject));
    if (!subjectMatch) continue;

    const tx = pattern.extractTransaction(text, subject);
    if (!tx || tx.amount === 0) continue;

    const purchaseDate = (() => {
      try {
        const d = new Date(tx.date);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch {
        return new Date().toISOString();
      }
    })();

    return {
      merchant: {
        rawName: tx.merchant,
        canonicalName: cleanMerchantName(tx.merchant),
        category: "Uncategorized",
        location: null,
      },
      purchase: {
        purchasedAt: purchaseDate,
        currency: "USD",
        subtotal: tx.amount,
        tax: 0,
        tip: 0,
        discount: 0,
        fees: 0,
        total: tx.amount,
      },
      payment: {
        method: "card",
        cardLast4: tx.cardLast4,
        walletType: null,
        entryMode: null,
      },
      items: [],
      metadata: {
        confidence: 0.8,
        requiresReview: false,
      },
    };
  }

  return null;
}

function cleanMerchantName(raw: string): string {
  return raw
    .replace(/\s*#\d+/g, "")
    .replace(/\s*\d{3,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export { BANK_PATTERNS };
