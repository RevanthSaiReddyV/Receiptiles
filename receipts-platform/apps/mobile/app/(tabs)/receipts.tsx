import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../lib/config-provider";
import { apiGet } from "../../lib/api";
import { MerchantIcon } from "../../components/ui/MerchantIcon";

interface Receipt {
  id: string;
  merchantCanonicalName: string;
  merchantRawName: string;
  merchantCategory: string;
  purchasedAt: string;
  total: number;
  cardLast4?: string;
}

const CATEGORIES = ["All", "Dining", "Groceries", "Shopping", "Travel", "Transport", "Entertainment"];

export default function ReceiptsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ receipts: Receipt[] }>("/api/mobile/receipts?limit=100");
      setReceipts(data.receipts);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = receipts.filter((r) => {
    const name = (r.merchantCanonicalName || r.merchantRawName).toLowerCase();
    const matchesSearch = !search || name.includes(search.toLowerCase());
    const matchesCat = selectedCategory === "All" || r.merchantCategory === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const sections = Object.entries(
    filtered.reduce((acc, r) => {
      const month = new Date(r.purchasedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!acc[month]) acc[month] = [];
      acc[month].push(r);
      return acc;
    }, {} as Record<string, Receipt[]>)
  ).map(([title, data]) => ({ title, data }));

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Search */}
      <View style={s.searchContainer}>
        <View style={[s.searchBar, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
          <Ionicons name="search" size={18} color={colors.outline} />
          <TextInput
            style={[s.searchInput, { color: colors.onSurface }]}
            placeholder="Search receipts..."
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              s.chip,
              { borderColor: colors.outlineVariant, backgroundColor: colors.surface },
              selectedCategory === cat && { backgroundColor: colors.secondary, borderColor: colors.secondary },
            ]}
          >
            <Text style={[s.chipText, { color: colors.onSurfaceVariant }, selectedCategory === cat && { color: "#101814" }]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Receipt List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.secondary} />}
        renderSectionHeader={({ section }) => (
          <View style={[s.sectionHeader, { borderBottomColor: colors.outlineVariant }]}>
            <Text style={[s.sectionTitle, { color: colors.onSurface }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <TouchableOpacity
            onPress={() => router.push(`/receipt/${item.id}`)}
            style={[
              s.row,
              { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant },
              index === section.data.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <MerchantIcon name={item.merchantCanonicalName || item.merchantRawName} category={item.merchantCategory} size={44} />
            <View style={s.rowContent}>
              <Text style={[s.merchantName, { color: colors.onSurface }]} numberOfLines={1}>
                {item.merchantCanonicalName || item.merchantRawName}
              </Text>
              <Text style={[s.rowMeta, { color: colors.onSurfaceVariant }]}>
                {new Date(item.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {item.cardLast4 ? ` • ••${item.cardLast4}` : ""}
              </Text>
            </View>
            <Text style={[s.amount, { color: colors.onSurface }]}>${item.total.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
            <Text style={[s.emptyTitle, { color: colors.onSurface }]}>No receipts found</Text>
            <Text style={[s.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              {search || selectedCategory !== "All"
                ? "Try adjusting your filters."
                : "Scan a receipt or connect your email to get started."}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 44, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  chips: { maxHeight: 44, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  rowContent: { flex: 1 },
  merchantName: { fontSize: 15, fontWeight: "600" },
  rowMeta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginTop: 6 },
});
