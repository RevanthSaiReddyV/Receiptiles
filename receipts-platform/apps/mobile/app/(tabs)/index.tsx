import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import Svg, { Rect, Circle, Path, Line } from "react-native-svg";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { MerchantIcon } from "../../components/ui/MerchantIcon";
import { ProgressRing } from "../../components/ui/ProgressRing";

const SCREEN_WIDTH = Dimensions.get("window").width;

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

interface CardRecommendation {
  category: string;
  bestCardName: string | null;
  rate: number;
}

interface SubscriptionAlert {
  id: string;
  title: string;
  message: string;
  amount: number | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [topCategories, setTopCategories] = useState<
    { category: string; total: number; color: string }[]
  >([]);
  const [cardRecs, setCardRecs] = useState<CardRecommendation[]>([]);
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [weekOverWeek, setWeekOverWeek] = useState(0);

  const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];

  const load = useCallback(async () => {
    try {
      const [receiptsRes, budgetRes, rewardsRes] = await Promise.allSettled([
        api<{ receipts: Receipt[] }>("/api/mobile/receipts?limit=50"),
        api<{ budgets: any[]; summary: BudgetSummary }>("/api/mobile/budgets"),
        api<{ bestCardPerCategory: CardRecommendation[] }>("/api/mobile/rewards"),
      ]);

      // Receipts & spending
      if (receiptsRes.status === "fulfilled") {
        const receipts = receiptsRes.value.receipts;
        setRecentReceipts(receipts.slice(0, 8));

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthReceipts = receipts.filter(
          (r) => new Date(r.purchasedAt) >= monthStart
        );
        const spend = thisMonthReceipts.reduce((s, r) => s + r.total, 0);
        setMonthlySpend(spend);

        // Category breakdown
        const catMap = new Map<string, number>();
        for (const r of thisMonthReceipts) {
          const cat = r.merchantCategory || "Other";
          catMap.set(cat, (catMap.get(cat) || 0) + r.total);
        }
        const catArr = Array.from(catMap, ([category, total], idx) => ({
          category,
          total,
          color: COLORS[idx % COLORS.length],
        }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopCategories(catArr);

        // Week-over-week change
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thisWeek = receipts
          .filter((r) => new Date(r.purchasedAt) >= oneWeekAgo)
          .reduce((s, r) => s + r.total, 0);
        const lastWeek = receipts
          .filter(
            (r) =>
              new Date(r.purchasedAt) >= twoWeeksAgo &&
              new Date(r.purchasedAt) < oneWeekAgo
          )
          .reduce((s, r) => s + r.total, 0);
        setWeekOverWeek(
          lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0
        );
      }

      // Budgets
      if (budgetRes.status === "fulfilled") {
        setBudgetSummary(budgetRes.value.summary);
      }

      // Rewards
      if (rewardsRes.status === "fulfilled") {
        setCardRecs(
          rewardsRes.value.bestCardPerCategory
            .filter((r) => r.bestCardName)
            .slice(0, 4)
        );
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>
          Receipts
        </Text>
        <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Text>

        {/* Spending Summary */}
        <Card variant="elevated" style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ fontSize: 13, color: "#6b7280", fontWeight: "500" }}>
                Spent this month
              </Text>
              <Text style={{ fontSize: 32, fontWeight: "800", color: "#171717", marginTop: 4 }}>
                ${monthlySpend.toFixed(2)}
              </Text>
              {weekOverWeek !== 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: weekOverWeek > 0 ? "#ef4444" : "#10b981",
                    }}
                  >
                    {weekOverWeek > 0 ? "↑" : "↓"} {Math.abs(weekOverWeek)}%
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>
                    vs last week
                  </Text>
                </View>
              )}
            </View>

            {/* Budget ring */}
            {budgetSummary && budgetSummary.totalBudget > 0 && (
              <ProgressRing
                progress={budgetSummary.progress}
                size={72}
                strokeWidth={7}
                label={`${Math.round(budgetSummary.progress * 100)}%`}
                sublabel="of budget"
              />
            )}
          </View>

          {/* Mini category bars */}
          {topCategories.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  height: 6,
                  borderRadius: 3,
                  overflow: "hidden",
                  backgroundColor: "#f3f4f6",
                }}
              >
                {topCategories.map((cat) => (
                  <View
                    key={cat.category}
                    style={{
                      flex: cat.total / monthlySpend,
                      backgroundColor: cat.color,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {topCategories.slice(0, 4).map((cat) => (
                  <View key={cat.category} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cat.color,
                      }}
                    />
                    <Text style={{ fontSize: 11, color: "#6b7280" }}>
                      {cat.category} ${cat.total.toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Card Optimizer Quick View */}
        {cardRecs.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
                Best Cards to Use
              </Text>
              <TouchableOpacity onPress={() => router.push("/cards")}>
                <Text style={{ fontSize: 13, color: "#2563eb", fontWeight: "600" }}>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12 }}
              contentContainerStyle={{ gap: 10 }}
            >
              {cardRecs.map((rec) => (
                <Card
                  key={rec.category}
                  variant="outlined"
                  padding={12}
                  style={{ width: 140 }}
                >
                  <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}>
                    {rec.category}
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: "700", color: "#171717", marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {rec.bestCardName}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: "#10b981", marginTop: 4 }}>
                    {rec.rate}%
                  </Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Activity */}
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717" }}>
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/receipts")}>
              <Text style={{ fontSize: 13, color: "#2563eb", fontWeight: "600" }}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <Card variant="outlined" padding={0} style={{ marginTop: 12, overflow: "hidden" }}>
            {recentReceipts.map((receipt, idx) => (
              <TouchableOpacity
                key={receipt.id}
                onPress={() => router.push(`/receipt/${receipt.id}`)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderBottomWidth: idx < recentReceipts.length - 1 ? 1 : 0,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <MerchantIcon
                  name={receipt.merchantCanonicalName || receipt.merchantRawName}
                  category={receipt.merchantCategory}
                  size={38}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: "#171717" }}
                    numberOfLines={1}
                  >
                    {receipt.merchantCanonicalName || receipt.merchantRawName}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                    {new Date(receipt.purchasedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {receipt.cardLast4 ? ` • ••${receipt.cardLast4}` : ""}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#171717" }}>
                  ${receipt.total.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/upload")}
            style={{
              flex: 1,
              backgroundColor: "#171717",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              Scan Receipt
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/subscriptions")}
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ color: "#171717", fontWeight: "700", fontSize: 14 }}>
              Subscriptions
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
