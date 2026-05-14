export interface RetailerAuth {
  authToken: string;
  clientId?: string;
  membershipId?: string;
  metadata?: Record<string, string>;
}

export interface RetailerOrder {
  orderId: string;
  retailer: string;
  merchantName: string;
  merchantLocation?: string;
  purchasedAt: Date;
  items: RetailerOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  cardLast4?: string;
  rawData?: unknown;
}

export interface RetailerOrderItem {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  imageUrl?: string;
}

export interface RetailerConnector {
  id: string;
  name: string;
  fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]>;
}
