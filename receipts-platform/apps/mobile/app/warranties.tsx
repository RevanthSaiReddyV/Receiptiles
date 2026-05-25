import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MerchantIcon } from "../components/ui/MerchantIcon";

interface ReturnWindow {
  id: string;
  itemName: string;
  merchant: string;
  category: string;
  purchaseDate: string;
  returnDeadline: string;
  daysLeft: number;
}

interface Warranty {
  id: string;
  productName: string;
  merchant: string;
  category: string;
  warrantyExpires: string;
  status: "active" | "expired";
}

const RETURN_WINDOWS: ReturnWindow[] = [
  {
    id: "1",
    itemName: "Sony WH-1000XM5 Headphones",
    merchant: "Best Buy",
    category: "Shopping",
    purchaseDate: "May 20, 2026",
    returnDeadline: "Jun 4, 2026",
    daysLeft: 10,
  },
  {
    id: "2",
    itemName: "Running Shoes - Nike Pegasus",
    merchant: "Nike",
    category: "Shopping",
    purchaseDate: "May 22, 2026",
    returnDeadline: "May 30, 2026",
    daysLeft: 5,
  },
  {
    id: "3",
    itemName: "Instant Pot Duo 7-in-1",
    merchant: "Amazon",
    category: "Shopping",
    purchaseDate: "May 24, 2026",
    returnDeadline: "May 26, 2026",
    daysLeft: 1,
  },
  {
    id: "4",
    itemName: "Cotton T-Shirt Pack (3)",
    merchant: "Target",
    category: "Shopping",
    purchaseDate: "May 10, 2026",
    returnDeadline: "Jun 20, 2026",
    daysLeft: 26,
  },
];

const WARRANTIES: Warranty[] = [
  {
    id: "1",
    productName: 'MacBook Pro 14"',
    merchant: "Apple",
    category: "Shopping",
    warrantyExpires: "Mar 15, 2027",
    status: "active",
  },
  {
    id: "2",
    productName: "LG OLED C3 55\" TV",
    merchant: "Best Buy",
    category: "Shopping",
    warrantyExpires: "Nov 20, 2026",
    status: "active",
  },
  {
    id: "3",
    productName: "Dyson V15 Vacuum",
    merchant: "Dyson",
    category: "Shopping",
    warrantyExpires: "Jan 8, 2026",
    status: "expired",
  },
  {
    id: "4",
    productName: "Samsung Galaxy Watch 6",
    merchant: "Samsung",
    category: "Shopping",
    warrantyExpires: "Sep 1, 2026",
    status: "active",
  },
];

function getDaysLeftBadgeStyle(daysLeft: number) {
  if (daysLeft > 7) {
    return { bg: "#89f6a6", text: "#006d36" };
  } else if (daysLeft >= 3) {
    return { bg: "#ffdfa0", text: "#5b4304" };
  } else {
    return { bg: "#ffdad6", text: "#93000a" };
  }
}

export default function WarrantiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{"‹"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Warranties & Returns</Text>
      </View>

      <Text style={styles.description}>
        Never miss a return window or warranty expiration
      </Text>

      {/* Active Return Windows */}
      <Text style={styles.sectionTitle}>Active Return Windows</Text>
      <View style={styles.list}>
        {RETURN_WINDOWS.map((item) => {
          const badgeColors = getDaysLeftBadgeStyle(item.daysLeft);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardRow}>
                <MerchantIcon name={item.merchant} category={item.category} size={40} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.itemName}
                    </Text>
                    <View style={[styles.daysLeftBadge, { backgroundColor: badgeColors.bg }]}>
                      <Text style={[styles.daysLeftText, { color: badgeColors.text }]}>
                        {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.merchantName}>{item.merchant}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>
                      Purchased {item.purchaseDate} — Return by {item.returnDeadline}
                    </Text>
                  </View>
                  <TouchableOpacity>
                    <Text style={styles.viewReceiptLink}>View Receipt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Warranty Tracking */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Warranty Tracking</Text>
      <View style={styles.list}>
        {WARRANTIES.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <MerchantIcon name={item.merchant} category={item.category} size={40} />
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === "active" ? "#89f6a6" : "#ffdad6",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === "active" ? "#006d36" : "#93000a",
                        },
                      ]}
                    >
                      {item.status === "active" ? "Active" : "Expired"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.merchantName}>{item.merchant}</Text>
                <Text style={styles.metaText}>
                  Warranty expires: {item.warrantyExpires}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🛡️</Text>
      <Text style={styles.emptyText}>
        No active warranties or return windows. Items with warranty info from your
        receipts will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c3c8c3",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 22,
    color: "#101814",
    marginTop: -2,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#101814",
  },
  description: {
    fontSize: 14,
    color: "#434845",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#101814",
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c3c8c3",
    padding: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#101814",
    flex: 1,
  },
  merchantName: {
    fontSize: 12,
    color: "#434845",
    marginBottom: 4,
  },
  daysLeftBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  daysLeftText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardMeta: {
    marginBottom: 6,
  },
  metaText: {
    fontSize: 11,
    color: "#434845",
    lineHeight: 16,
  },
  viewReceiptLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "#006d36",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#434845",
    textAlign: "center",
    lineHeight: 20,
  },
});
