import type { CanonicalReceipt } from "@receipts/shared";

export interface ImportConnector {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportedFormats: string[];
  instructions: string;
  parseFile(
    content: string,
    fileName: string
  ): Promise<ImportedOrder[]>;
  normalizeOrder(
    order: ImportedOrder
  ): Omit<CanonicalReceipt, "id" | "userId" | "createdAt" | "updatedAt">;
}

export interface ImportedOrder {
  id: string;
  provider: string;
  rawData: unknown;
  merchantName: string;
  merchantLocation?: string;
  items: ImportedOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  cardLast4?: string;
  orderDate: Date;
  orderUrl?: string;
  status: string;
}

export interface ImportedOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  asin?: string;
  url?: string;
}
