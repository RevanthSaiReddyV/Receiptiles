import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../lib/config-provider";
import { apiGet, apiPost } from "../lib/api";

interface Subscription {
  id: string;
  merchantName: string;
  amount: number;
  frequency: string;
  status: string;
  confidence: number;
  nextExpectedAt: string | null;
  category: string | null;
}

interface Summary { activeCount: number; monthlyTotal: number; annualTotal: number; }

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ subscriptions: Subscription[]; summary: Summary }>("/api/mobile/subscriptions");
      setSubs(data.subscriptions);
      setSummary(data.summary);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.secondary} /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.secondary} />}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.onSurface }]}>Subscriptions</Text>
        <TouchableOpacity onPress={async () => { setSyncing(true); await apiPost("/api/mobile/subscriptions", {}); await load(); setSyncing(false); }} style={[s.detectBtn, { backgroundColor: colors.secondary }]}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#101814" }}>{syncing ? "Scanning..." : "Detect"}</Text>
        </TouchableOpacity>
      </View>

      {summary && (
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[s.statLabel, { color: colors.onSurfaceVariant }]}>Monthly</Text>
            <Text style={[s.statValue, { color: colors.onSurface }]}>${summary.monthlyTotal.toFixed(2)}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[s.statLabel, { color: colors.onSurfaceVariant }]}>Annual</Text>
            <Text style={[s.statValue, { color: colors.onSurface }]}>${summary.annualTotal.toFixed(0)}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[s.statLabel, { color: colors.onSurfaceVariant }]}>Active</Text>
            <Text style={[s.statValue, { color: colors.onSurface }]}>{summary.activeCount}</Text>
          </View>
        </View>
      )}

      {subs.length === 0 ? (
        <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🔄</Text>
          <Text style={[s.emptyTitle, { color: colors.onSurface }]}>No subscriptions detected</Text>
          <Text style={[s.emptySubtitle, { color: colors.onSurfaceVariant }]}>As you add receipts, we'll detect recurring charges automatically.</Text>
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {subs.map((sub) => {
            const freq: Record<string, string> = { WEEKLY: "/wk", MONTHLY: "/mo", ANNUAL: "/yr" };
            return (
              <View key={sub.id} style={[s.subCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.subName, { color: colors.onSurface }]}>{sub.merchantName}</Text>
                  {sub.category && <Text style={[s.subCategory, { color: colors.onSurfaceVariant, backgroundColor: colors.surfaceContainer }]}>{sub.category}</Text>}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.subAmount, { color: colors.onSurface }]}>${sub.amount.toFixed(2)}</Text>
                  <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>{freq[sub.frequency] || sub.frequency}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  detectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  empty: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", marginTop: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 6, maxWidth: 260 },
  subCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 16 },
  subName: { fontSize: 15, fontWeight: "600" },
  subCategory: { fontSize: 11, marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  subAmount: { fontSize: 17, fontWeight: "700" },
});
