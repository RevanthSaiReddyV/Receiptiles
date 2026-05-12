import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { api, clearToken } from "../../lib/api";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface EmailConnection {
  id: string;
  provider: string;
  email: string;
  lastSyncAt: string | null;
}

interface PosConnection {
  id: string;
  provider: string;
  merchantName: string | null;
  merchantId: string;
  lastSyncAt: string | null;
}

interface CustomerConnection {
  id: string;
  provider: string;
  email: string | null;
  lastSyncAt: string | null;
}

interface Connections {
  email: EmailConnection[];
  pos: PosConnection[];
  customer: CustomerConnection[];
}

const POS_PROVIDERS = [
  { id: "square", name: "Square", icon: "◻️" },
  { id: "shopify", name: "Shopify", icon: "🛍️" },
  { id: "clover", name: "Clover", icon: "☘️" },
];

const CUSTOMER_PROVIDERS = [
  { id: "paypal", name: "PayPal", icon: "💳" },
  { id: "shopify-customer", name: "Shopify (Customer)", icon: "🛒" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connections, setConnections] = useState<Connections | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const data = await api<Connections>("/api/mobile/connections");
      setConnections(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api<{ imported: number }>("/api/mobile/sync", {
        method: "POST",
      });
      Alert.alert("Sync Complete", `Imported ${result.imported} new receipts.`);
      fetchConnections(); // Refresh lastSyncAt times
    } catch {
      Alert.alert("Sync Failed", "Could not sync receipts. Try again later.");
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectEmail = async () => {
    const result = await WebBrowser.openBrowserAsync(
      `${API_URL}/api/email/connect`
    );
    if (result.type === "cancel" || result.type === "dismiss") {
      // User returned — refresh connections in case OAuth completed
      fetchConnections();
    }
  };

  const handleConnectPos = async (provider: string) => {
    const result = await WebBrowser.openBrowserAsync(
      `${API_URL}/api/connectors/${provider}/connect`
    );
    if (result.type === "cancel" || result.type === "dismiss") {
      fetchConnections();
    }
  };

  const handleConnectCustomer = async (provider: string) => {
    const result = await WebBrowser.openBrowserAsync(
      `${API_URL}/api/connectors/customer/${provider}/connect`
    );
    if (result.type === "cancel" || result.type === "dismiss") {
      fetchConnections();
    }
  };

  const handleDisconnect = (
    type: "email" | "pos" | "customer",
    id: string,
    name: string
  ) => {
    Alert.alert("Disconnect", `Remove ${name} connection?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/mobile/connections", {
              method: "DELETE",
              body: JSON.stringify({ type, id }),
            });
            fetchConnections();
          } catch {
            Alert.alert("Error", "Failed to disconnect.");
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          router.replace("/");
        },
      },
    ]);
  };

  const isConnected = (type: "pos" | "customer", provider: string) => {
    if (!connections) return false;
    if (type === "pos") {
      return connections.pos.some((c) => c.provider === provider);
    }
    return connections.customer.some((c) => c.provider === provider);
  };

  const getConnection = (type: "pos" | "customer", provider: string) => {
    if (!connections) return null;
    if (type === "pos") {
      return connections.pos.find((c) => c.provider === provider) ?? null;
    }
    return connections.customer.find((c) => c.provider === provider) ?? null;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ padding: 16, paddingBottom: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Settings</Text>

        {/* Sync */}
        <SectionHeader title="Sync" />
        <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.cardTitle}>Sync All Sources</Text>
              <Text style={styles.cardSubtitle}>
                Pull new receipts from all connected accounts
              </Text>
            </View>
            {syncing && <ActivityIndicator size="small" />}
          </View>
        </TouchableOpacity>

        {/* Email Connections */}
        <SectionHeader title="Email" />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : (
          <>
            {connections?.email.map((conn) => (
              <ConnectedCard
                key={conn.id}
                icon="📧"
                title={conn.email}
                subtitle={`Gmail • ${formatLastSync(conn.lastSyncAt)}`}
                onDisconnect={() =>
                  handleDisconnect("email", conn.id, conn.email)
                }
              />
            ))}
            <TouchableOpacity onPress={handleConnectEmail} style={styles.card}>
              <Text style={styles.cardTitle}>
                {connections?.email.length ? "＋ Add Another Gmail" : "📧 Connect Gmail"}
              </Text>
              <Text style={styles.cardSubtitle}>
                Auto-import receipts from Amazon, Walmart, Target, and 12+ more
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* POS Connectors */}
        <SectionHeader title="POS / Merchant" />
        {POS_PROVIDERS.map((provider) => {
          const conn = getConnection("pos", provider.id);
          if (conn) {
            return (
              <ConnectedCard
                key={conn.id}
                icon={provider.icon}
                title={
                  (conn as PosConnection).merchantName ?? provider.name
                }
                subtitle={`${provider.name} • ${formatLastSync(conn.lastSyncAt)}`}
                onDisconnect={() =>
                  handleDisconnect(
                    "pos",
                    conn.id,
                    (conn as PosConnection).merchantName ?? provider.name
                  )
                }
              />
            );
          }
          return (
            <TouchableOpacity
              key={provider.id}
              onPress={() => handleConnectPos(provider.id)}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>
                {provider.icon} Connect {provider.name}
              </Text>
              <Text style={styles.cardSubtitle}>
                Import orders directly from your {provider.name} account
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Customer Connectors */}
        <SectionHeader title="Purchase Accounts" />
        {CUSTOMER_PROVIDERS.map((provider) => {
          const conn = getConnection("customer", provider.id);
          if (conn) {
            return (
              <ConnectedCard
                key={conn.id}
                icon={provider.icon}
                title={
                  (conn as CustomerConnection).email ?? provider.name
                }
                subtitle={`${provider.name} • ${formatLastSync(conn.lastSyncAt)}`}
                onDisconnect={() =>
                  handleDisconnect(
                    "customer",
                    conn.id,
                    (conn as CustomerConnection).email ?? provider.name
                  )
                }
              />
            );
          }
          return (
            <TouchableOpacity
              key={provider.id}
              onPress={() => handleConnectCustomer(provider.id)}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>
                {provider.icon} Connect {provider.name}
              </Text>
              <Text style={styles.cardSubtitle}>
                Import purchase history from {provider.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Wallet Pass */}
        <SectionHeader title="Wallet" />
        <TouchableOpacity
          onPress={() => router.push("/wallet")}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>📲 Master Receipt Pass</Text>
          <Text style={styles.cardSubtitle}>
            Add to Apple/Google Wallet for tap-to-receive at terminals
          </Text>
        </TouchableOpacity>

        {/* Cards & Account */}
        <SectionHeader title="Account" />
        <TouchableOpacity
          onPress={() => router.push("/cards")}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>💳 Cards & Rewards</Text>
          <Text style={styles.cardSubtitle}>
            Manage payment cards and reward rules
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignOut} style={[styles.card, { marginTop: 24 }]}>
          <Text style={[styles.cardTitle, { color: "#dc2626" }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
      }}
    >
      {title}
    </Text>
  );
}

function ConnectedCard({
  icon,
  title,
  subtitle,
  onDisconnect,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onDisconnect: () => void;
}) {
  return (
    <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>
          {icon} {title}
        </Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        onPress={onDisconnect}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: "#fef2f2",
        }}
      >
        <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "600" }}>
          Remove
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Never synced";
  const date = new Date(lastSyncAt);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Synced ${days}d ago`;
}

const styles = {
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  } as const,
  cardTitle: {
    fontWeight: "500" as const,
    fontSize: 15,
  },
  cardSubtitle: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
};
