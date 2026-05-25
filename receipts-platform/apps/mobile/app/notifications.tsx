import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  actionUrl?: string;
  createdAt: string;
  read: boolean;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  price_drop: { bg: "#ecfdf5", text: "#059669" },
  unusual_spending: { bg: "#fef3c7", text: "#d97706" },
  subscription_renewal: { bg: "#ede9fe", text: "#7c3aed" },
  receipt_summary: { bg: "#eff6ff", text: "#2563eb" },
  offer_expiring: { bg: "#fce7f3", text: "#db2777" },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiGet("/api/mobile/notifications");
      setNotifications(data.notifications ?? []);
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Smart alerts based on your spending</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            We'll notify you about price drops, unusual spending, and upcoming renewals.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notif) => {
            const colors = TYPE_COLORS[notif.type] ?? { bg: "#f3f4f6", text: "#374151" };
            return (
              <TouchableOpacity key={notif.id} style={styles.card}>
                <View style={[styles.iconBadge, { backgroundColor: colors.bg }]}>
                  <Text style={styles.iconText}>{notif.icon}</Text>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{notif.title}</Text>
                    <Text style={styles.cardTime}>
                      {getTimeAgo(notif.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.cardBody}>{notif.body}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.text }]}>
                      {notif.type.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 22 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  cardTime: { fontSize: 11, color: "#9ca3af" },
  cardBody: { fontSize: 13, color: "#4b5563", lineHeight: 18, marginBottom: 6 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
});
