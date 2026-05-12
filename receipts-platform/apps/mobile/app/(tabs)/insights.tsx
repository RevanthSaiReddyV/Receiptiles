import { View, Text, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import Svg, { Rect, Text as SvgText, Line, Circle } from "react-native-svg";

interface Receipt {
  id: string;
  merchantCanonicalName: string | null;
  merchantRawName: string;
  merchantCategory: string | null;
  purchasedAt: string;
  total: number;
}

interface CategorySpend {
  category: string;
  total: number;
  count: number;
  color: string;
}

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];
const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - 64;

export default function InsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [categories, setCategories] = useState<CategorySpend[]>([]);
  const [topMerchants, setTopMerchants] = useState<{ name: string; total: number }[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api<{ receipts: Receipt[] }>("/api/mobile/receipts?limit=50");
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthReceipts = res.receipts.filter(
        (r) => new Date(r.purchasedAt) >= monthStart
      );

      const total = thisMonthReceipts.reduce((s, r) => s + r.total, 0);
      setMonthlySpend(total);

      // Category aggregation
      const catMap = new Map<string, { total: number; count: number }>();
      for (const r of thisMonthReceipts) {
        const cat = r.merchantCategory ?? "Uncategorized";
        const prev = catMap.get(cat) ?? { total: 0, count: 0 };
        catMap.set(cat, { total: prev.total + r.total, count: prev.count + 1 });
      }
      const catArr = Array.from(catMap, ([category, { total, count }], idx) => ({
        category,
        total,
        count,
        color: COLORS[idx % COLORS.length],
      })).sort((a, b) => b.total - a.total);
      setCategories(catArr);

      // Top merchants
      const merchMap = new Map<string, number>();
      for (const r of thisMonthReceipts) {
        const name = r.merchantCanonicalName ?? r.merchantRawName;
        merchMap.set(name, (merchMap.get(name) ?? 0) + r.total);
      }
      const merchArr = Array.from(merchMap, ([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopMerchants(merchArr);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const maxMerchant = topMerchants.length > 0 ? Math.max(...topMerchants.map((m) => m.total)) : 1;
  const barHeight = 28;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Insights</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>
          Spending breakdown this month
        </Text>

        {/* Monthly Total */}
        <View style={{ marginTop: 20, backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ color: "#6b7280", fontSize: 13 }}>This Month</Text>
          <Text style={{ fontSize: 28, fontWeight: "bold", marginTop: 4 }}>
            ${monthlySpend.toFixed(2)}
          </Text>
        </View>

        {/* Category Pie (simple horizontal bar representation) */}
        {categories.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: "600", marginBottom: 12 }}>By Category</Text>

            {/* Stacked bar */}
            <Svg width={CHART_WIDTH} height={32}>
              {(() => {
                let x = 0;
                return categories.map((cat, i) => {
                  const width = monthlySpend > 0 ? (cat.total / monthlySpend) * CHART_WIDTH : 0;
                  const bar = (
                    <Rect key={i} x={x} y={0} width={width} height={28} fill={cat.color} rx={i === 0 ? 6 : 0} ry={i === 0 ? 6 : 0} />
                  );
                  x += width;
                  return bar;
                });
              })()}
            </Svg>

            {/* Legend */}
            <View style={{ marginTop: 12, gap: 6 }}>
              {categories.map((cat) => (
                <View key={cat.category} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: cat.color }} />
                    <Text style={{ fontSize: 13 }}>{cat.category}</Text>
                  </View>
                  <Text style={{ fontWeight: "500", fontSize: 13 }}>${cat.total.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Merchants Bar Chart */}
        {topMerchants.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: "600", marginBottom: 12 }}>Top Merchants</Text>
            <Svg width={CHART_WIDTH} height={topMerchants.length * (barHeight + 12) + 4}>
              {topMerchants.map((m, i) => {
                const barWidth = (m.total / maxMerchant) * (CHART_WIDTH - 100);
                const y = i * (barHeight + 12);
                return (
                  <View key={m.name}>
                    <SvgText x={0} y={y + 18} fontSize={12} fill="#374151">{m.name}</SvgText>
                    <Rect x={100} y={y + 2} width={barWidth} height={barHeight - 4} fill="#2563eb" rx={4} />
                    <SvgText x={100 + barWidth + 6} y={y + 18} fontSize={11} fill="#6b7280">
                      ${m.total.toFixed(0)}
                    </SvgText>
                  </View>
                );
              })}
            </Svg>
          </View>
        )}

        {categories.length === 0 && topMerchants.length === 0 && (
          <View style={{ marginTop: 24, backgroundColor: "#fff", borderRadius: 12, padding: 24, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" }}>
            <Text style={{ color: "#6b7280" }}>Upload receipts to see spending insights</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
