import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  RefreshControl,
  Image,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost } from "@/lib/api";

interface ReferralStats {
  totalSent: number;
  totalClaimed: number;
  totalRewarded: number;
  conversionRate: number;
}

interface ReferralPerson {
  id: string;
  refereeName: string;
  refereeImage: string | null;
  claimedAt: string;
  status: string;
}

interface RewardEntry {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export default function ReferralsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [stats, setStats] = useState<ReferralStats>({ totalSent: 0, totalClaimed: 0, totalRewarded: 0, conversionRate: 0 });
  const [referrals, setReferrals] = useState<ReferralPerson[]>([]);
  const [rewards, setRewards] = useState<{ totalPoints: number; history: RewardEntry[] }>({ totalPoints: 0, history: [] });
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiGet("/api/mobile/referrals");
      setCode(data.code);
      setDeepLink(data.deepLink);
      setStats(data.stats);
      setReferrals(data.recentReferrals);
      setRewards(data.rewards);
    } catch (err) {
      console.error("Failed to fetch referral data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleShare = async (channel: string) => {
    try {
      const res = await apiPost("/api/mobile/referrals", { channel });
      await Share.share({
        message: res.shareMessage,
        url: res.deepLink,
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      {/* Header Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>🎁</Text>
        <Text style={styles.heroTitle}>Invite Friends, Earn Rewards</Text>
        <Text style={styles.heroSubtitle}>
          Share your receipt wallet with friends. You both earn points when they join.
        </Text>

        {/* Referral Code */}
        <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
          <Text style={styles.codeLabel}>Your Code</Text>
          <Text style={styles.codeText}>{code}</Text>
          <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={20} color={copied ? "#10b981" : "#6b7280"} />
        </TouchableOpacity>

        {/* Share Buttons */}
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare("sms")}>
            <Ionicons name="chatbubble" size={22} color="#fff" />
            <Text style={styles.shareBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: "#1DA1F2" }]} onPress={() => handleShare("social")}>
            <Ionicons name="share-social" size={22} color="#fff" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: "#6366f1" }]} onPress={() => handleShare("email")}>
            <Ionicons name="mail" size={22} color="#fff" />
            <Text style={styles.shareBtnText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: "#111" }]} onPress={() => handleShare("qr")}>
            <Ionicons name="qr-code" size={22} color="#fff" />
            <Text style={styles.shareBtnText}>QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalClaimed}</Text>
          <Text style={styles.statLabel}>Friends Joined</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{rewards.totalPoints}</Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.conversionRate.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </View>
      </View>

      {/* Rewards Tier */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reward Milestones</Text>
        <View style={styles.milestoneRow}>
          {[
            { count: 3, reward: "500 pts", icon: "star" },
            { count: 5, reward: "1,000 pts", icon: "trophy" },
            { count: 10, reward: "Premium Month", icon: "diamond" },
            { count: 25, reward: "Lifetime VIP", icon: "ribbon" },
          ].map((m) => (
            <View key={m.count} style={[styles.milestone, stats.totalClaimed >= m.count && styles.milestoneComplete]}>
              <Ionicons
                name={m.icon as any}
                size={20}
                color={stats.totalClaimed >= m.count ? "#10b981" : "#d1d5db"}
              />
              <Text style={[styles.milestoneCount, stats.totalClaimed >= m.count && { color: "#10b981" }]}>
                {m.count}
              </Text>
              <Text style={styles.milestoneReward}>{m.reward}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      {referrals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends Who Joined</Text>
          {referrals.map((r) => (
            <View key={r.id} style={styles.activityRow}>
              {r.refereeImage ? (
                <Image source={{ uri: r.refereeImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{r.refereeName[0]}</Text>
                </View>
              )}
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{r.refereeName}</Text>
                <Text style={styles.activityDate}>
                  Joined {new Date(r.claimedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, r.status === "rewarded" && styles.statusRewarded]}>
                <Text style={styles.statusText}>+500 pts</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Rewards History */}
      {rewards.history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reward History</Text>
          {rewards.history.map((r) => (
            <View key={r.id} style={styles.rewardRow}>
              <View style={styles.rewardIcon}>
                <Ionicons
                  name={r.type === "milestone" ? "trophy" : r.type === "referrer_bonus" ? "gift" : "sparkles"}
                  size={16}
                  color="#6366f1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardDesc}>{r.description}</Text>
                <Text style={styles.rewardDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.rewardAmount}>+{r.amount}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroCard: {
    margin: 16,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 20,
    width: "100%",
  },
  codeLabel: { fontSize: 12, color: "#6b7280", marginRight: 4 },
  codeText: { fontSize: 18, fontWeight: "700", color: "#111", flex: 1 },
  shareRow: { flexDirection: "row", gap: 10 },
  shareBtn: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 4,
  },
  shareBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 },
  milestoneRow: { flexDirection: "row", justifyContent: "space-between" },
  milestone: {
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    width: "23%",
  },
  milestoneComplete: { backgroundColor: "#ecfdf5" },
  milestoneCount: { fontSize: 14, fontWeight: "700", color: "#6b7280", marginTop: 4 },
  milestoneReward: { fontSize: 9, color: "#9ca3af", marginTop: 2, textAlign: "center" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#6b7280" },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: "600", color: "#111" },
  activityDate: { fontSize: 12, color: "#9ca3af" },
  statusBadge: { backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusRewarded: { backgroundColor: "#ede9fe" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#10b981" },
  rewardRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  rewardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardDesc: { fontSize: 13, color: "#374151" },
  rewardDate: { fontSize: 11, color: "#9ca3af" },
  rewardAmount: { fontSize: 14, fontWeight: "700", color: "#10b981" },
});
