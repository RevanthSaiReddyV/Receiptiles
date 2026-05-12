import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

interface Receipt {
  id: string;
  merchantCanonicalName: string | null;
  merchantRawName: string;
  merchantCategory: string | null;
  purchasedAt: string;
  total: number;
  currency: string;
}

interface ReceiptsResponse {
  receipts: Receipt[];
  nextCursor: string | null;
}

export default function ReceiptsScreen() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchReceipts = useCallback(async (reset = false) => {
    try {
      const params = reset ? "" : cursor ? `?cursor=${cursor}` : "";
      const data = await api<ReceiptsResponse>(`/api/mobile/receipts${params}`);
      setReceipts(reset ? data.receipts : [...receipts, ...data.receipts]);
      setCursor(data.nextCursor);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cursor, receipts]);

  useEffect(() => { fetchReceipts(true); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCursor(null);
    fetchReceipts(true);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb", padding: 16 }}>
      {receipts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#6b7280", fontSize: 16 }}>
            No receipts yet. Connect your email or upload a receipt!
          </Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={() => { if (cursor) fetchReceipts(); }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/receipt/${item.id}`)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={{ fontWeight: "600" }}>
                  {item.merchantCanonicalName ?? item.merchantRawName}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  {new Date(item.purchasedAt).toLocaleDateString()}
                </Text>
                {item.merchantCategory && (
                  <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                    {item.merchantCategory}
                  </Text>
                )}
              </View>
              <Text style={{ fontWeight: "600" }}>
                ${item.total.toFixed(2)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
