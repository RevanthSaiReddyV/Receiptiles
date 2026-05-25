import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../lib/config-provider";
import { api } from "../../lib/api";

interface RewardsSummary {
  totalRewardsEarned: number;
  totalMissedRewards: number;
  cardsCount: number;
}

interface CardRec {
  category: string;
  bestCardName: string | null;
  rate: number;
  rewardType: string;
}

interface MissedReward {
  receiptId: string;
  merchant: string;
  total: number;
  recommendation: { cardName: string; estimatedReward: number };
}

interface UserCard {
  id: string;
  name: string;
  last4: string;
  network: string;
}

export default function RewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [cardRecs, setCardRecs] = useState<CardRec[]>([]);
  const [missedRewards, setMissedRewards] = useState<MissedReward[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);

  const load = useCallback(async () => {
    try {
      const [rRes, cRes] = await Promise.allSettled([
        api<{ summary: RewardsSummary; bestCardPerCategory: CardRec[]; missedRewards: MissedReward[] }>("/api/mobile/rewards"),
        api<{ cards: UserCard[] }>("/api/mobile/cards"),
      ]);
      if (rRes.status === "fulfilled") {
        setSummary(rRes.value.summary);
        setCardRecs(rRes.value.bestCardPerCategory?.filter((r) => r.bestCardName) ?? []);
        setMissedRewards(rRes.value.missedRewards ?? []);
      }
      if (cRes.status === "fulfilled") setCards(cRes.value.cards);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const totalEarned = summary?.totalRewardsEarned ?? 0;
  const totalMissed = summary?.totalMissedRewards ?? 0;
  const maxPotential = totalEarned + totalMissed;
  const optimizationScore = maxPotential > 0 ? Math.round((totalEarned / maxPotential) * 100) : 0;

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.secondary} /></View>;
  }

  if (cards.length === 0 && !summary) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12 }}>
        <Text style={[s.headline, { color: colors.onSurface }]}>Maximize Rewards</Text>
        <Text style={[s.subtitle, { color: colors.onSurfaceVariant }]}>Your reward optimization strategy starts here.</Text>

        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.secondaryContainer + "30", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 36 }}>💳</Text>
          </View>
          <Text style={[s.cardTitle, { color: colors.onSurface }]}>Add your credit cards</Text>
          <Text style={[s.cardSubtitle, { color: colors.onSurfaceVariant }]}>
            We'll analyze every purchase and tell you which card earns the most.
          </Text>
          <TouchableOpacity onPress={() => router.push("/cards")} style={[s.ctaBtn, { backgroundColor: colors.secondary }]}>
            <Text style={[s.ctaBtnText, { color: colors.onPrimary }]}>Add Your First Card</Text>
          </TouchableOpacity>
        </View>

        {/* Preview cards */}
        <Text style={[s.sectionLabel, { color: colors.onSurfaceVariant }]}>WHAT YOU'LL UNLOCK</Text>
        {[
          { accent: colors.secondary, title: "Best card per category", desc: "Dining 4x, Travel 3x, Groceries 5%" },
          { accent: "#e6c279", title: "Missed rewards alerts", desc: "Know when you use the wrong card" },
          { accent: "#6fdc8f", title: "Signup bonus tracking", desc: "Hit spend targets on time" },
        ].map((item) => (
          <View key={item.title} style={[s.previewCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <View style={{ width: 4, height: 32, borderRadius: 2, backgroundColor: item.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.previewTitle, { color: colors.onSurface }]}>{item.title}</Text>
              <Text style={[s.previewDesc, { color: colors.onSurfaceVariant }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.secondary} />}
    >
      <Text style={[s.headline, { color: colors.onSurface }]}>Maximized This Month</Text>
      <Text style={[s.subtitle, { color: colors.onSurfaceVariant }]}>Your reward optimization strategy is working.</Text>

      {/* Hero */}
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.heroLabel, { color: colors.onSurfaceVariant }]}>TOTAL EXTRA VALUE EARNED</Text>
          <Text style={[s.heroValue, { color: colors.onSurface }]}>${totalEarned.toFixed(2)}</Text>
        </View>
        <View style={s.gauge}>
          <Text style={[s.gaugeValue, { color: colors.secondary }]}>{optimizationScore}%</Text>
          <Text style={[s.gaugeLabel, { color: colors.onSurfaceVariant }]}>Score</Text>
        </View>
      </View>

      {/* Card Recs */}
      {cardRecs.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[s.sectionLabel, { color: colors.onSurfaceVariant }]}>BEST CARD PER CATEGORY</Text>
          {cardRecs.slice(0, 5).map((rec) => (
            <View key={rec.category} style={[s.recRow, { borderBottomColor: colors.outlineVariant }]}>
              <Text style={[s.recCategory, { color: colors.onSurfaceVariant }]}>{rec.category}</Text>
              <Text style={[s.recCard, { color: colors.onSurface }]}>{rec.bestCardName}</Text>
              <Text style={[s.recRate, { color: colors.secondary }]}>{rec.rate}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Missed */}
      {missedRewards.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[s.sectionLabel, { color: colors.onSurfaceVariant }]}>MISSED OPPORTUNITIES</Text>
          {missedRewards.slice(0, 3).map((m) => (
            <View key={m.receiptId} style={[s.missedRow, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.missedMerchant, { color: colors.onSurface }]}>{m.merchant}</Text>
                <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>Use {m.recommendation.cardName}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.error }}>-${m.recommendation.estimatedReward.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      <View style={[s.ctaCard, { backgroundColor: colors.primaryContainer }]}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.onPrimary }}>Never Miss Out</Text>
        <Text style={{ fontSize: 13, color: colors.onPrimary + "AA", marginTop: 4 }}>Get real-time alerts before you tap the wrong card.</Text>
        <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.secondary, marginTop: 16 }]}>
          <Text style={[s.ctaBtnText, { color: "#101814" }]}>Set Up Auto-Reminders</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headline: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4, marginBottom: 20 },
  card: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  cardSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  ctaBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20 },
  ctaBtnText: { fontSize: 15, fontWeight: "700" },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 24, marginBottom: 12 },
  previewCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  previewTitle: { fontSize: 15, fontWeight: "600" },
  previewDesc: { fontSize: 13, marginTop: 2 },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 24, flexDirection: "row", alignItems: "center" },
  heroLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  heroValue: { fontSize: 32, fontWeight: "800", marginTop: 4, letterSpacing: -1 },
  gauge: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#6fdc8f20", justifyContent: "center", alignItems: "center" },
  gaugeValue: { fontSize: 22, fontWeight: "800" },
  gaugeLabel: { fontSize: 10, fontWeight: "600" },
  recRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  recCategory: { width: 90, fontSize: 13, fontWeight: "500" },
  recCard: { flex: 1, fontSize: 14, fontWeight: "600" },
  recRate: { fontSize: 16, fontWeight: "800" },
  missedRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  missedMerchant: { fontSize: 14, fontWeight: "600" },
  ctaCard: { borderRadius: 20, padding: 24, marginTop: 28 },
});
