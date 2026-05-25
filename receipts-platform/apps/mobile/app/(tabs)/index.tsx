import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { api } from "../../lib/api";
import { useColors } from "../../lib/config-provider";
import { MerchantIcon } from "../../components/ui/MerchantIcon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Receipt {
  id: string;
  merchantCanonicalName: string;
  merchantRawName: string;
  merchantCategory: string;
  purchasedAt: string;
  total: number;
  cardLast4?: string;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  progress: number;
}

interface CardRec {
  category: string;
  bestCardName: string | null;
  rate: number;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [cardRecs, setCardRecs] = useState<CardRec[]>([]);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [weekChange, setWeekChange] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const load = useCallback(async () => {
    try {
      const [rRes, bRes, cRes] = await Promise.allSettled([
        api<{ receipts: Receipt[] }>("/api/mobile/receipts?limit=50"),
        api<{ budgets: any[]; summary: BudgetSummary }>("/api/mobile/budgets"),
        api<{ bestCardPerCategory: CardRec[] }>("/api/mobile/rewards"),
      ]);

      if (rRes.status === "fulfilled") {
        const r = rRes.value.receipts;
        setReceipts(r.slice(0, 6));
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = r.filter((x) => new Date(x.purchasedAt) >= monthStart);
        const spend = thisMonth.reduce((s, x) => s + x.total, 0);
        setMonthlySpend(spend);

        const oneWeek = new Date(now.getTime() - 7 * 86400000);
        const twoWeeks = new Date(now.getTime() - 14 * 86400000);
        const tw = r.filter((x) => new Date(x.purchasedAt) >= oneWeek).reduce((s, x) => s + x.total, 0);
        const lw = r.filter((x) => new Date(x.purchasedAt) >= twoWeeks && new Date(x.purchasedAt) < oneWeek).reduce((s, x) => s + x.total, 0);
        setWeekChange(lw > 0 ? Math.round(((tw - lw) / lw) * 100) : 0);
      }
      if (bRes.status === "fulfilled") setBudget(bRes.value.summary);
      if (cRes.status === "fulfilled") setCardRecs(cRes.value.bestCardPerCategory?.filter((x) => x.bestCardName).slice(0, 4) ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const hasData = monthlySpend > 0 || receipts.length > 0;
  const colors = useColors();

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.secondary} />}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[s.content, { paddingTop: insets.top + 12, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={[s.avatar, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[s.avatarText, { color: colors.secondary }]}>R</Text>
            </View>
            <View>
              <Text style={[s.title, { color: colors.onSurface }]}>Receipts</Text>
              <Text style={[s.subtitle, { color: colors.onSurfaceVariant }]}>
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[s.settingsBtn, { backgroundColor: colors.surfaceContainer }]} onPress={() => router.push("/(tabs)/settings" as any)}>
            <Ionicons name="settings-outline" size={20} color={colors.outline} />
          </TouchableOpacity>
        </View>

        {hasData ? (
          <DataView
            monthlySpend={monthlySpend}
            weekChange={weekChange}
            budget={budget}
            cardRecs={cardRecs}
            receipts={receipts}
            router={router}
            colors={colors}
          />
        ) : (
          <EmptyView router={router} colors={colors} />
        )}
      </Animated.View>
    </ScrollView>
  );
}

// ─── DATA VIEW ─────────────────────────────────────────────────────────────

const DataView = memo(function DataView({ monthlySpend, weekChange, budget, cardRecs, receipts, router, colors }: any) {
  return (
    <>
      {/* Spending Card */}
      <View style={[s.spendCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.spendLabel, { color: colors.onSurfaceVariant }]}>Total Monthly Spend</Text>
          <Text style={[s.spendAmount, { color: colors.onSurface }]}>${monthlySpend.toFixed(2)}</Text>
          {weekChange !== 0 && (
            <View style={s.trendRow}>
              <Ionicons name={weekChange < 0 ? "trending-down" : "trending-up"} size={16} color={weekChange < 0 ? "#006d36" : "#ba1a1a"} />
              <Text style={[s.trendText, { color: weekChange < 0 ? "#006d36" : "#ba1a1a" }]}>
                {weekChange > 0 ? "+" : ""}{weekChange}% vs last week
              </Text>
            </View>
          )}
        </View>
        {budget && budget.totalBudget > 0 && (
          <BudgetRing progress={budget.progress} />
        )}
      </View>

      {/* Card Recs */}
      {cardRecs.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Best Cards to Use</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {cardRecs.map((rec: CardRec) => (
              <View key={rec.category} style={s.recCard}>
                <Text style={s.recCategory}>{rec.category}</Text>
                <Text style={s.recCardName} numberOfLines={1}>{rec.bestCardName}</Text>
                <Text style={s.recRate}>{rec.rate}%</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent */}
      {receipts.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/receipts")}>
              <Text style={s.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={s.activityCard}>
            {receipts.map((r: Receipt, i: number) => (
              <TouchableOpacity key={r.id} onPress={() => router.push(`/receipt/${r.id}`)} style={[s.activityRow, i < receipts.length - 1 && s.activityBorder]}>
                <MerchantIcon name={r.merchantCanonicalName || r.merchantRawName} category={r.merchantCategory} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.merchantName} numberOfLines={1}>{r.merchantCanonicalName || r.merchantRawName}</Text>
                  <Text style={s.merchantMeta}>{new Date(r.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{r.cardLast4 ? ` • ••${r.cardLast4}` : ""}</Text>
                </View>
                <Text style={s.amount}>${r.total.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={s.quickActions}>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push("/upload")} activeOpacity={0.8}>
          <Ionicons name="scan-outline" size={18} color="#ffffff" />
          <Text style={s.primaryBtnText}>Scan Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.secondaryBtn, { borderColor: colors.outlineVariant }]} onPress={() => router.push("/subscriptions")} activeOpacity={0.8}>
          <Text style={[s.secondaryBtnText, { color: colors.onSurface }]}>Subscriptions</Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

// ─── EMPTY VIEW ────────────────────────────────────────────────────────────

const EmptyView = memo(function EmptyView({ router, colors }: any) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <>
      {/* Hero Card */}
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        <Animated.View style={[s.heroIllustration, { transform: [{ translateY: floatAnim }] }]}>
          <View style={s.receiptShape}>
            <View style={s.receiptLine1} />
            <View style={s.receiptLine2} />
            <View style={s.receiptLine3} />
            <View style={s.receiptDot} />
          </View>
        </Animated.View>
        <Text style={[s.heroTitle, { color: colors.onSurface }]}>Your financial story{"\n"}starts here</Text>
        <Text style={[s.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Connect your accounts to see spending insights, card recommendations, and budget progress.
        </Text>
        <TouchableOpacity style={s.heroCta} onPress={() => router.push("/connections")} activeOpacity={0.8}>
          <Ionicons name="mail-outline" size={18} color="#101814" />
          <Text style={s.heroCtaText}>Connect Gmail</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/upload")} style={{ marginTop: 12 }}>
          <Text style={[s.heroLink, { color: colors.onSurfaceVariant }]}>or scan a receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 24 }} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
        <FeatureCard accent="#89f6a6" icon="analytics-outline" title="Smart Insights" desc="See where every dollar goes" colors={colors} />
        <FeatureCard accent="#e6c279" icon="card-outline" title="Card Optimizer" desc="Never miss cashback again" colors={colors} />
        <FeatureCard accent="#6fdc8f" icon="refresh-outline" title="Auto-Detect" desc="Find recurring charges automatically" colors={colors} />
      </ScrollView>

      {/* Quick Actions */}
      <View style={[s.quickActions, { marginTop: 28 }]}>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push("/upload")} activeOpacity={0.8}>
          <Ionicons name="scan-outline" size={18} color="#ffffff" />
          <Text style={s.primaryBtnText}>Scan Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.secondaryBtn, { borderColor: colors.outlineVariant }]} onPress={() => router.push("/subscriptions")} activeOpacity={0.8}>
          <Text style={[s.secondaryBtnText, { color: colors.onSurface }]}>Subscriptions</Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

// ─── FEATURE CARD ──────────────────────────────────────────────────────────

const FeatureCard = memo(function FeatureCard({ accent, icon, title, desc, colors }: { accent: string; icon: any; title: string; desc: string; colors?: any }) {
  return (
    <View style={[s.featureCard, colors && { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
      <View style={[s.featureAccent, { backgroundColor: accent }]} />
      <Ionicons name={icon} size={22} color={colors?.onSurface ?? "#101814"} style={{ marginBottom: 10 }} />
      <Text style={[s.featureTitle, colors && { color: colors.onSurface }]}>{title}</Text>
      <Text style={[s.featureDesc, colors && { color: colors.onSurfaceVariant }]}>{desc}</Text>
    </View>
  );
});

// ─── BUDGET RING ───────────────────────────────────────────────────────────

const BudgetRing = memo(function BudgetRing({ progress }: { progress: number }) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e3e2df" strokeWidth={strokeWidth} />
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#6fdc8f" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={offset} />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#101814" }}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
});

// ─── STYLES ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#faf9f5" },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#242d28", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#89f6a6", fontSize: 14, fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "700", color: "#101814", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#747874", marginTop: 1 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#efeeea", justifyContent: "center", alignItems: "center" },

  // Spending
  spendCard: { backgroundColor: "#ffffff", borderRadius: 20, borderWidth: 1, borderColor: "#c3c8c3", padding: 24, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 30, elevation: 4 },
  spendLabel: { fontSize: 13, color: "#747874", fontWeight: "500", letterSpacing: 0.3 },
  spendAmount: { fontSize: 34, fontWeight: "700", color: "#101814", marginTop: 4, letterSpacing: -1 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  trendText: { fontSize: 13, fontWeight: "500" },

  // Sections
  section: { marginTop: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#101814", marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: "600", color: "#006d36" },

  // Card recs
  recCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#c3c8c3", borderRadius: 14, padding: 14, width: 150 },
  recCategory: { fontSize: 12, color: "#747874", fontWeight: "500" },
  recCardName: { fontSize: 14, fontWeight: "700", color: "#101814", marginTop: 6 },
  recRate: { fontSize: 20, fontWeight: "800", color: "#006d36", marginTop: 4 },

  // Activity
  activityCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#c3c8c3", borderRadius: 16, overflow: "hidden" },
  activityRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: "#e3e2df" },
  merchantName: { fontSize: 15, fontWeight: "600", color: "#101814" },
  merchantMeta: { fontSize: 12, color: "#747874", marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700", color: "#101814" },

  // Quick Actions
  quickActions: { marginTop: 24, gap: 10 },
  primaryBtn: { backgroundColor: "#242d28", borderRadius: 999, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { borderWidth: 1.5, borderColor: "#c3c8c3", borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  secondaryBtnText: { color: "#101814", fontSize: 16, fontWeight: "600" },

  // Hero (empty state)
  heroCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#c3c8c3", borderRadius: 24, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 30, elevation: 4 },
  heroIllustration: { marginBottom: 24 },
  receiptShape: { width: 80, height: 100, backgroundColor: "#f5f4f0", borderRadius: 12, borderWidth: 1, borderColor: "#e3e2df", padding: 14, justifyContent: "center", gap: 8 },
  receiptLine1: { height: 6, width: "70%", backgroundColor: "#c3c8c3", borderRadius: 3 },
  receiptLine2: { height: 6, width: "50%", backgroundColor: "#e3e2df", borderRadius: 3 },
  receiptLine3: { height: 6, width: "60%", backgroundColor: "#e3e2df", borderRadius: 3 },
  receiptDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#89f6a6" },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#101814", textAlign: "center", letterSpacing: -0.3, lineHeight: 30 },
  heroSubtitle: { fontSize: 15, color: "#434845", textAlign: "center", marginTop: 10, lineHeight: 22, maxWidth: 280 },
  heroCta: { marginTop: 24, backgroundColor: "#89f6a6", borderRadius: 999, paddingVertical: 16, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#89f6a6", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  heroCtaText: { fontSize: 16, fontWeight: "700", color: "#101814" },
  heroLink: { fontSize: 14, color: "#747874", textDecorationLine: "underline" },

  // Feature cards
  featureCard: { width: 200, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#c3c8c3", borderRadius: 16, padding: 18, overflow: "hidden" },
  featureAccent: { position: "absolute", left: 0, top: 12, bottom: 12, width: 4, borderRadius: 2 },
  featureTitle: { fontSize: 15, fontWeight: "700", color: "#101814" },
  featureDesc: { fontSize: 13, color: "#747874", marginTop: 4 },
});
