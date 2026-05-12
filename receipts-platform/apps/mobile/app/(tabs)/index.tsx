import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";

interface Receipt {
  id: string;
  merchantCanonicalName: string | null;
  merchantRawName: string;
  purchasedAt: string;
  total: number;
}

interface DashboardData {
  totalReceipts: number;
  monthlySpend: number;
  recentReceipts: Receipt[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<{ receipts: Receipt[] }>("/api/mobile/receipts?limit=50");
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlySpend = res.receipts
        .filter((r) => new Date(r.purchasedAt) >= monthStart)
        .reduce((sum, r) => sum + r.total, 0);

      setData({
        totalReceipts: res.receipts.length,
        monthlySpend,
        recentReceipts: res.receipts.slice(0, 5),
      });
    } catch {
      setData({ totalReceipts: 0, monthlySpend: 0, recentReceipts: [] });
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Dashboard</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>
          Your receipt overview
        </Text>

        <View style={{ marginTop: 24, flexDirection: "row", gap: 12 }}>
          <StatCard label="Total Receipts" value={String(data?.totalReceipts ?? 0)} />
          <StatCard
            label="This Month"
            value={`$${(data?.monthlySpend ?? 0).toFixed(2)}`}
          />
        </View>

        {data && data.recentReceipts.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>Recent</Text>
            {data.recentReceipts.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => router.push(`/receipt/${r.id}`)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text>{r.merchantCanonicalName ?? r.merchantRawName}</Text>
                <Text style={{ fontWeight: "600" }}>${r.total.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <Text style={{ fontSize: 12, color: "#6b7280" }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}
