import type { CanonicalReceipt } from "@receipts/shared";

export interface PosConnector {
  id: string;
  name: string;
  getAuthUrl(merchantId: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<ConnectorCredentials>;
  refreshToken(credentials: ConnectorCredentials): Promise<ConnectorCredentials>;
  fetchOrders(
    credentials: ConnectorCredentials,
    options: FetchOrdersOptions
  ): Promise<PosOrder[]>;
  normalizeOrder(order: PosOrder): Omit<CanonicalReceipt, "id" | "userId" | "createdAt" | "updatedAt">;
}

export interface ConnectorCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  merchantId: string;
  locationId?: string;
  metadata?: Record<string, string>;
}

export interface FetchOrdersOptions {
  since?: Date;
  until?: Date;
  limit?: number;
  cursor?: string;
  locationId?: string;
}

export interface PosOrder {
  id: string;
  provider: string;
  rawData: unknown;
  merchantName: string;
  merchantLocation?: string;
  items: PosOrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
  createdAt: Date;
}

export interface PosOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: string[];
  category?: string;
}
