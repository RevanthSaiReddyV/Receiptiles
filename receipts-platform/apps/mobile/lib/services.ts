import { api, apiGet, apiPost, apiPut, apiDelete } from "./api";

// All web app API endpoints wired to typed mobile functions

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) =>
    apiPost<{ token: string; user: { id: string; name: string; email: string } }>(
      "/api/mobile/auth",
      { email, password, action: "login" }
    ),
  signup: (name: string, email: string, password: string) =>
    apiPost<{ token: string; user: { id: string; name: string; email: string } }>(
      "/api/mobile/auth",
      { name, email, password, action: "signup" }
    ),
};

// ─── Receipts ────────────────────────────────────────────────────────────────
export const receiptService = {
  list: (limit = 100) =>
    apiGet<{ receipts: Receipt[] }>(`/api/mobile/receipts?limit=${limit}`),
  getById: (id: string) =>
    apiGet<{ receipt: ReceiptDetail }>(`/api/mobile/receipts/${id}`),
  upload: (formData: FormData) =>
    api<{ receipt: Receipt }>("/api/mobile/upload", {
      method: "POST",
      body: formData,
    }),
  claim: (token: string) =>
    apiPost<{ receipt: Receipt }>("/api/mobile/claim", { token }),
};

// ─── Budgets ─────────────────────────────────────────────────────────────────
export const budgetService = {
  list: () =>
    apiGet<{ budgets: Budget[]; summary: BudgetSummary }>("/api/mobile/budgets"),
  create: (category: string, monthlyLimit: number) =>
    apiPost("/api/mobile/budgets", { category, monthlyLimit }),
  delete: (category: string) =>
    api("/api/mobile/budgets", {
      method: "DELETE",
      body: JSON.stringify({ category }),
    }),
};

// ─── Rewards & Cards ─────────────────────────────────────────────────────────
export const rewardsService = {
  get: () =>
    apiGet<{
      summary: RewardsSummary;
      bestCardPerCategory: CardRecommendation[];
      missedRewards: MissedReward[];
      signupBonuses: SignupBonus[];
      cardRewards: CardReward[];
    }>("/api/mobile/rewards"),
  listCards: () => apiGet<{ cards: UserCard[] }>("/api/mobile/cards"),
  addCard: (card: { name: string; last4: string; network: string; issuer?: string }) =>
    apiPost<{ card: UserCard }>("/api/mobile/cards", card),
  deleteCard: (id: string) => apiDelete(`/api/mobile/cards/${id}`),
};

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const subscriptionService = {
  list: () =>
    apiGet<{ subscriptions: Subscription[]; alerts: SubscriptionAlert[]; summary: SubscriptionSummary }>(
      "/api/mobile/subscriptions"
    ),
  detect: () => apiPost("/api/mobile/subscriptions", {}),
  dismissAlert: (alertId: string) =>
    apiPost("/api/mobile/subscriptions", { alertId, action: "dismiss" }),
};

// ─── Connections ─────────────────────────────────────────────────────────────
export const connectionService = {
  list: () => apiGet<{ connections: Connection[] }>("/api/mobile/connections"),
  sync: () => apiPost<{ imported: number }>("/api/mobile/connections/sync", {}),
  gmailAuthUrl: () => apiGet<{ url: string }>("/api/mobile/gmail/auth-url"),
  gmailConnect: (code: string) =>
    apiPost<{ connected: boolean; receiptsFound: number }>("/api/mobile/gmail/connect", { code }),
};

// ─── Sync ────────────────────────────────────────────────────────────────────
export const syncService = {
  syncAll: () =>
    apiPost<{ imported: number; breakdown: { email: number; pos: number; customer: number } }>(
      "/api/mobile/sync",
      {}
    ),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationService = {
  list: () => apiGet<{ notifications: AppNotification[] }>("/api/mobile/notifications"),
  registerPushToken: (token: string) =>
    apiPost("/api/mobile/push-token", { token }),
};

// ─── Config ──────────────────────────────────────────────────────────────────
export const configService = {
  get: () => apiGet<RemoteConfigResponse>("/api/mobile/config"),
};

// ─── Price Tracking ──────────────────────────────────────────────────────────
export const priceTrackingService = {
  get: () => apiGet<{ items: TrackedItem[] }>("/api/mobile/price-tracking"),
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Receipt {
  id: string;
  merchantCanonicalName: string;
  merchantRawName: string;
  merchantCategory: string;
  purchasedAt: string;
  total: number;
  cardLast4?: string;
}

export interface ReceiptDetail extends Receipt {
  subtotal?: number;
  tax?: number;
  tip?: number;
  items: { name: string; quantity: number; price: number }[];
  source?: string;
  imageUrl?: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  progress: number;
  remaining: number;
  dailyBudget: number;
  isOverBudget: boolean;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  progress: number;
  period: string;
}

export interface RewardsSummary {
  totalRewardsEarned: number;
  totalMissedRewards: number;
  cardsCount: number;
  monthlyTransactions: number;
}

export interface CardRecommendation {
  category: string;
  bestCardName: string | null;
  rate: number;
  rewardType: string;
}

export interface MissedReward {
  receiptId: string;
  merchant: string;
  total: number;
  recommendation: {
    cardName: string;
    rewardRate: number;
    estimatedReward: number;
    reason: string;
  };
}

export interface SignupBonus {
  id: string;
  cardName: string;
  targetSpend: number;
  currentSpend: number;
  bonusValue: string;
  progress: number;
  remaining: number;
  daysLeft: number;
  dailyNeeded: number;
}

export interface CardReward {
  cardId: string;
  cardName: string;
  earned: number;
  count: number;
}

export interface UserCard {
  id: string;
  name: string;
  last4: string;
  network: string;
  issuer: string | null;
}

export interface Subscription {
  id: string;
  merchantName: string;
  amount: number;
  frequency: string;
  status: string;
  confidence: number;
  nextExpectedAt: string | null;
  lastChargeAt: string | null;
  category: string | null;
  alertsEnabled: boolean;
}

export interface SubscriptionAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  amount: number | null;
}

export interface SubscriptionSummary {
  activeCount: number;
  monthlyTotal: number;
  annualTotal: number;
  alertCount: number;
}

export interface Connection {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  receiptsImported: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface TrackedItem {
  id: string;
  name: string;
  merchant: string;
  lastPrice: number;
  lowestPrice: number;
  priceHistory: { date: string; price: number }[];
}

export interface RemoteConfigResponse {
  version: number;
  theme: Record<string, string>;
  features: Record<string, boolean>;
  copy: Record<string, any>;
  layout: Record<string, any>;
  maintenance: { enabled: boolean; message: string };
  minAppVersion: string;
  forceUpdate: boolean;
}
