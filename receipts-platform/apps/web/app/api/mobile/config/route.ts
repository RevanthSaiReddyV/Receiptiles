import { NextResponse } from "next/server";

// Remote config served to mobile app.
// Edit this object to change app behavior without a release.
// For a DB-backed version, move this to a Prisma model or edge KV store.

const config = {
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
    emptyReceiptsMessage:
      "No receipts yet. Scan one or connect your email to get started.",
    aiGreeting:
      "Hi! I can help you understand your spending, create budgets, or find the best card for any purchase.",
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
    homeSections: [
      "spending",
      "categoryBar",
      "cardRecs",
      "recentActivity",
      "quickActions",
    ],
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

export async function GET() {
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
