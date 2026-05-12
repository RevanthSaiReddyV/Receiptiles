import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string | null;
}

interface ReceiptDetail {
  id: string;
  merchantRawName: string;
  merchantCanonicalName: string | null;
  merchantCategory: string | null;
  purchasedAt: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  paymentMethod: string | null;
  cardLast4: string | null;
  source: string;
  items: ReceiptItem[];
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ReceiptDetail>(`/api/mobile/receipts/${id}`)
      .then(setReceipt)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#6b7280" }}>Receipt not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
          {receipt.merchantCanonicalName ?? receipt.merchantRawName}
        </Text>
        <Text style={{ color: "#6b7280", marginTop: 4 }}>
          {new Date(receipt.purchasedAt).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>

        <View
          style={{
            marginTop: 20,
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          {receipt.items.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: "600", marginBottom: 8 }}>Items</Text>
              {receipt.items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ flex: 1 }}>
                    {item.quantity > 1 ? `${item.quantity}x ` : ""}
                    {item.name}
                  </Text>
                  <Text>${item.totalPrice.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 12 }}>
            {receipt.subtotal > 0 && (
              <Row label="Subtotal" value={`$${receipt.subtotal.toFixed(2)}`} />
            )}
            {receipt.tax > 0 && (
              <Row label="Tax" value={`$${receipt.tax.toFixed(2)}`} />
            )}
            {receipt.tip > 0 && (
              <Row label="Tip" value={`$${receipt.tip.toFixed(2)}`} />
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>Total</Text>
              <Text style={{ fontWeight: "bold" }}>
                ${receipt.total.toFixed(2)}
              </Text>
            </View>
          </View>

          {receipt.paymentMethod && (
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 13 }}>
                {receipt.paymentMethod}
                {receipt.cardLast4 ? ` ending in ${receipt.cardLast4}` : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          {receipt.merchantCategory && <Tag text={receipt.merchantCategory} />}
          <Tag text={receipt.source} />
        </View>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ color: "#6b7280" }}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: "#e5e7eb",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 12, color: "#374151" }}>{text}</Text>
    </View>
  );
}
