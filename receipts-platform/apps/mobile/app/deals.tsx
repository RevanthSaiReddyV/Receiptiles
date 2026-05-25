import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MerchantIcon } from "../components/ui/MerchantIcon";

interface Deal {
  id: string;
  merchant: string;
  category: string;
  description: string;
  expiresAt: string;
  savingsAmount?: number;
  featured?: boolean;
}

const FEATURED_DEALS: Deal[] = [
  {
    id: "1",
    merchant: "Whole Foods",
    category: "Groceries",
    description: "10% off your next order",
    expiresAt: "Jun 5, 2026",
    featured: true,
  },
  {
    id: "2",
    merchant: "Uber Eats",
    category: "Dining",
    description: "$5 off orders over $25",
    expiresAt: "Jun 12, 2026",
    featured: true,
  },
  {
    id: "3",
    merchant: "Shell",
    category: "Gas",
    description: "15c off per gallon",
    expiresAt: "Jun 1, 2026",
    featured: true,
  },
  {
    id: "4",
    merchant: "Target",
    category: "Shopping",
    description: "20% off home essentials",
    expiresAt: "Jun 8, 2026",
    featured: true,
  },
];

const SPENDING_DEALS: Deal[] = [
  {
    id: "5",
    merchant: "Trader Joe's",
    category: "Groceries",
    description: "Buy 3 get 1 free on snacks",
    expiresAt: "Jun 10, 2026",
    savingsAmount: 8,
  },
  {
    id: "6",
    merchant: "Starbucks",
    category: "Coffee",
    description: "Double stars on mobile orders",
    expiresAt: "Jun 3, 2026",
    savingsAmount: 5,
  },
  {
    id: "7",
    merchant: "Amazon",
    category: "Shopping",
    description: "5% back on subscribe & save",
    expiresAt: "Jun 15, 2026",
    savingsAmount: 12,
  },
  {
    id: "8",
    merchant: "DoorDash",
    category: "Dining",
    description: "Free delivery on next 3 orders",
    expiresAt: "Jun 7, 2026",
    savingsAmount: 15,
  },
];

export default function DealsScreen() {
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
        <Text style={styles.title}>Deals & Offers</Text>
      </View>

      <Text style={styles.description}>
        Personalized offers based on your spending habits
      </Text>

      {/* Featured Offers */}
      <Text style={styles.sectionTitle}>Featured Offers</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScroll}
      >
        {FEATURED_DEALS.map((deal) => (
          <View key={deal.id} style={styles.featuredCard}>
            <View style={styles.featuredIconRow}>
              <MerchantIcon name={deal.merchant} category={deal.category} size={36} />
            </View>
            <Text style={styles.featuredMerchant}>{deal.merchant}</Text>
            <Text style={styles.featuredDescription}>{deal.description}</Text>
            <Text style={styles.featuredExpiry}>Expires {deal.expiresAt}</Text>
            <TouchableOpacity style={styles.activateButton}>
              <Text style={styles.activateText}>Activate</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Based on Your Spending */}
      <Text style={styles.sectionTitle}>Based on Your Spending</Text>
      <View style={styles.spendingList}>
        {SPENDING_DEALS.map((deal) => (
          <View key={deal.id} style={styles.spendingCard}>
            <MerchantIcon name={deal.merchant} category={deal.category} size={40} />
            <View style={styles.spendingContent}>
              <View style={styles.spendingTopRow}>
                <Text style={styles.spendingMerchant}>{deal.merchant}</Text>
                {deal.savingsAmount && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>Save ${deal.savingsAmount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.spendingDescription}>{deal.description}</Text>
              <View style={styles.spendingMeta}>
                <Text style={styles.spendingExpiry}>Expires {deal.expiresAt}</Text>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{deal.category}</Text>
                </View>
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
      <Text style={styles.emptyIcon}>🎁</Text>
      <Text style={styles.emptyText}>
        No deals available yet. As you add more receipts, we'll find relevant offers.
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
  featuredScroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  featuredCard: {
    width: 180,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#c3c8c3",
    padding: 16,
    marginRight: 12,
  },
  featuredIconRow: {
    marginBottom: 10,
  },
  featuredMerchant: {
    fontSize: 15,
    fontWeight: "700",
    color: "#101814",
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 13,
    color: "#434845",
    marginBottom: 8,
    lineHeight: 18,
  },
  featuredExpiry: {
    fontSize: 11,
    color: "#434845",
    marginBottom: 12,
  },
  activateButton: {
    backgroundColor: "#89f6a6",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  activateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#101814",
  },
  spendingList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  spendingCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c3c8c3",
    padding: 14,
    alignItems: "flex-start",
    gap: 12,
  },
  spendingContent: {
    flex: 1,
  },
  spendingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  spendingMerchant: {
    fontSize: 15,
    fontWeight: "700",
    color: "#101814",
  },
  savingsBadge: {
    backgroundColor: "#89f6a6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#006d36",
  },
  spendingDescription: {
    fontSize: 13,
    color: "#434845",
    marginBottom: 6,
  },
  spendingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  spendingExpiry: {
    fontSize: 11,
    color: "#434845",
  },
  categoryTag: {
    backgroundColor: "#eef1ee",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#434845",
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
