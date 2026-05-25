import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { MerchantIcon } from "../../components/ui/MerchantIcon";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
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
  items: ReceiptItem[];
  cardLast4: string | null;
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ receipt: ReceiptDetail }>(`/api/mobile/receipts/${id}`)
      .then((res) => setReceipt(res.receipt))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#101814" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Receipt not found</Text>
      </View>
    );
  }

  const merchantName =
    receipt.merchantCanonicalName ?? receipt.merchantRawName;
  const formattedDate = new Date(receipt.purchasedAt).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#101814" />
        </Pressable>
        <Text style={styles.headerTitle}>Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt Card */}
        <View style={styles.card}>
          {/* Top Section */}
          <View style={styles.topSection}>
            <MerchantIcon
              name={merchantName}
              category={receipt.merchantCategory ?? undefined}
              size={80}
            />
            <Text style={styles.merchantName}>{merchantName}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#101814"
              />
              <Text style={styles.verifiedText}>Verified Digital</Text>
            </View>
          </View>

          {/* Dashed Divider */}
          <View style={styles.dashedDivider} />

          {/* Itemized List */}
          {receipt.items.length > 0 && (
            <View style={styles.itemsSection}>
              {receipt.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemQuantity}>
                      {item.quantity}x
                    </Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Dashed Divider */}
          <View style={styles.dashedDivider} />

          {/* Totals Section */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                ${receipt.subtotal.toFixed(2)}
              </Text>
            </View>
            {receipt.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>
                  ${receipt.tax.toFixed(2)}
                </Text>
              </View>
            )}
            {receipt.tip > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tip</Text>
                <Text style={styles.totalValue}>
                  ${receipt.tip.toFixed(2)}
                </Text>
              </View>
            )}
            <Text style={styles.grandTotal}>
              ${receipt.total.toFixed(2)}
            </Text>
          </View>

          {/* Sustainability Impact */}
          <View style={styles.sustainabilitySection}>
            <Text style={styles.sustainabilityLabel}>
              SUSTAINABILITY IMPACT
            </Text>
            <View style={styles.sustainabilityCards}>
              <View style={styles.sustainabilityCard}>
                <Ionicons
                  name="receipt-outline"
                  size={18}
                  color="#8cf9a8"
                />
                <Text style={styles.sustainabilityMetricLabel}>
                  Paper Saved
                </Text>
                <Text style={styles.sustainabilityMetricValue}>14cm</Text>
              </View>
              <View style={styles.sustainabilityCard}>
                <Ionicons name="leaf-outline" size={18} color="#8cf9a8" />
                <Text style={styles.sustainabilityMetricLabel}>
                  CO2 Offset
                </Text>
                <Text style={styles.sustainabilityMetricValue}>
                  0.2kg
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <View style={styles.paymentValue}>
              <Ionicons name="card-outline" size={16} color="#101814" />
              <Text style={styles.paymentText}>
                Visa **** {receipt.cardLast4 ?? "----"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.downloadButton} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={18} color="#101814" />
            <Text style={styles.downloadButtonText}>Download PDF</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={16} color="#101814" />
              <Text style={styles.secondaryButtonText}>Share Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
            >
              <Ionicons name="flag-outline" size={16} color="#101814" />
              <Text style={styles.secondaryButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#efeeea",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#efeeea",
  },
  errorText: {
    color: "#434845",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#101814",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  topSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  merchantName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#101814",
    marginTop: 16,
    textAlign: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#434845",
    marginTop: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#89f6a6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
    gap: 5,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#101814",
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#c3c8c3",
    borderStyle: "dashed",
    marginHorizontal: 24,
  },
  itemsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 14,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: "#434845",
    fontWeight: "500",
  },
  itemName: {
    fontSize: 15,
    color: "#101814",
    fontWeight: "500",
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    color: "#101814",
    fontWeight: "600",
  },
  totalsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#f8f8f6",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: "#434845",
  },
  totalValue: {
    fontSize: 14,
    color: "#101814",
    fontWeight: "500",
  },
  grandTotal: {
    fontSize: 36,
    fontWeight: "700",
    color: "#101814",
    textAlign: "center",
    marginTop: 12,
  },
  sustainabilitySection: {
    backgroundColor: "#242d28",
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  sustainabilityLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7a8a7e",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  sustainabilityCards: {
    flexDirection: "row",
    gap: 12,
  },
  sustainabilityCard: {
    flex: 1,
    backgroundColor: "#2f3b35",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  sustainabilityMetricLabel: {
    fontSize: 12,
    color: "#7a8a7e",
    fontWeight: "500",
  },
  sustainabilityMetricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8cf9a8",
  },
  paymentSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#c3c8c3",
  },
  paymentLabel: {
    fontSize: 13,
    color: "#434845",
    fontWeight: "500",
  },
  paymentValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paymentText: {
    fontSize: 14,
    color: "#101814",
    fontWeight: "600",
  },
  actionsContainer: {
    width: "100%",
    maxWidth: 380,
    marginTop: 20,
    gap: 10,
  },
  downloadButton: {
    backgroundColor: "#8cf9a8",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#101814",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#c3c8c3",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#101814",
  },
});
