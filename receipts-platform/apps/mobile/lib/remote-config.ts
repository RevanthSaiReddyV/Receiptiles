import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app";

const CACHE_KEY = "remote_config";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// -------------------------------------------------------------------
// Config Schema — everything the app reads remotely
// -------------------------------------------------------------------

export interface RemoteConfig {
  version: number;

  theme: {
    accent: string;
    accentGold: string;
    background: string;
    surface: string;
    surfaceBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
    navBackground: string;
    navBorder: string;
    tabIndicator: string;
  };

  features: {
    aiInsights: boolean;
    askAi: boolean;
    locationRewards: boolean;
    subscriptionDetection: boolean;
    budgets: boolean;
    nfcClaim: boolean;
    walletPass: boolean;
    plaidConnections: boolean;
    gmailImport: boolean;
    referrals: boolean;
    priceTracking: boolean;
    darkMode: boolean;
  };

  copy: {
    appName: string;
    homeTitle: string;
    homeSubtitle: string;
    scanButtonLabel: string;
    emptyReceiptsMessage: string;
    aiGreeting: string;
    aiSuggestions: string[];
    onboardingHeadlines: string[];
  };

  layout: {
    homeSections: string[]; // ordered list of section IDs to render
    tabOrder: string[];
    maxRecentReceipts: number;
    maxCardRecs: number;
    showCategoryBar: boolean;
    showWeekOverWeek: boolean;
    budgetRingPosition: "right" | "below" | "hidden";
  };

  maintenance: {
    enabled: boolean;
    message: string;
  };

  minAppVersion: string;
  forceUpdate: boolean;
}

// -------------------------------------------------------------------
// Defaults — app works offline with these
// -------------------------------------------------------------------

export const DEFAULT_CONFIG: RemoteConfig = {
  version: 1,

  theme: {
    accent: "#7BE899",
    accentGold: "#E8C47B",
    background: "#fafafa",
    surface: "#ffffff",
    surfaceBorder: "#f3f4f6",
    textPrimary: "#171717",
    textSecondary: "#6b7280",
    textMuted: "#9ca3af",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    navBackground: "#ffffff",
    navBorder: "#f3f4f6",
    tabIndicator: "#171717",
  },

  features: {
    aiInsights: true,
    askAi: true,
    locationRewards: true,
    subscriptionDetection: true,
    budgets: true,
    nfcClaim: true,
    walletPass: true,
    plaidConnections: true,
    gmailImport: true,
    referrals: true,
    priceTracking: false,
    darkMode: false,
  },

  copy: {
    appName: "Receipts",
    homeTitle: "Receipts",
    homeSubtitle: "",
    scanButtonLabel: "Scan Receipt",
    emptyReceiptsMessage: "No receipts yet. Scan one or connect your email to get started.",
    aiGreeting: "Hi! I can help you understand your spending, create budgets, or find the best card for any purchase.",
    aiSuggestions: [
      "How much did I spend on dining this month?",
      "Can I afford a $200 purchase this week?",
      "Which subscriptions should I cancel?",
      "Create a budget for next month",
      "What's my best card for travel?",
    ],
    onboardingHeadlines: [
      "From Chaos to Clarity",
      "All Your Receipts, One Place",
      "Smart Money Insights",
      "Save Trees, Save Money",
    ],
  },

  layout: {
    homeSections: ["spending", "categoryBar", "cardRecs", "recentActivity", "quickActions"],
    tabOrder: ["home", "budgets", "upload", "rewards", "settings"],
    maxRecentReceipts: 8,
    maxCardRecs: 4,
    showCategoryBar: true,
    showWeekOverWeek: true,
    budgetRingPosition: "right",
  },

  maintenance: {
    enabled: false,
    message: "",
  },

  minAppVersion: "1.0.0",
  forceUpdate: false,
};

// -------------------------------------------------------------------
// Cache layer
// -------------------------------------------------------------------

interface CacheEntry {
  config: RemoteConfig;
  fetchedAt: number;
}

let memoryCache: CacheEntry | null = null;

async function readCache(): Promise<CacheEntry | null> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    memoryCache = entry;
    return entry;
  } catch {
    return null;
  }
}

async function writeCache(config: RemoteConfig) {
  const entry: CacheEntry = { config, fetchedAt: Date.now() };
  memoryCache = entry;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}

// -------------------------------------------------------------------
// Fetch
// -------------------------------------------------------------------

async function fetchConfig(): Promise<RemoteConfig> {
  const res = await fetch(`${API_URL}/api/mobile/config`, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  const data = await res.json();
  return { ...DEFAULT_CONFIG, ...data };
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

export async function getConfig(): Promise<RemoteConfig> {
  const cached = await readCache();
  const isStale = !cached || Date.now() - cached.fetchedAt > CACHE_TTL;

  if (cached && !isStale) {
    return cached.config;
  }

  // Return cached immediately, refresh in background
  if (cached && isStale) {
    fetchConfig()
      .then(writeCache)
      .catch(() => {});
    return cached.config;
  }

  // No cache at all — must fetch
  try {
    const config = await fetchConfig();
    await writeCache(config);
    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function refreshConfig(): Promise<RemoteConfig> {
  try {
    const config = await fetchConfig();
    await writeCache(config);
    return config;
  } catch {
    const cached = await readCache();
    return cached?.config ?? DEFAULT_CONFIG;
  }
}

// -------------------------------------------------------------------
// React Hook
// -------------------------------------------------------------------

export function useRemoteConfig(): {
  config: RemoteConfig;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [config, setConfig] = useState<RemoteConfig>(memoryCache?.config ?? DEFAULT_CONFIG);
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    getConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });

    // Refresh on app foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshConfig().then(setConfig);
      }
    });
    return () => sub.remove();
  }, []);

  const refresh = useCallback(async () => {
    const c = await refreshConfig();
    setConfig(c);
  }, []);

  return { config, loading, refresh };
}

// Feature flag shorthand
export function useFeature(flag: keyof RemoteConfig["features"]): boolean {
  const { config } = useRemoteConfig();
  return config.features[flag];
}
