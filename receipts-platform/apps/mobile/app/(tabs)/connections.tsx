import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Card } from "../../components/ui/Card";
import { apiGet, apiPost, apiDelete } from "../../lib/api";

interface RetailerInfo {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  authMethod: string;
  description: string;
  dataTypes: string[];
  popular: boolean;
  connected: boolean;
  connectionId?: string;
  lastSyncAt?: string;
  receiptCount: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function ConnectionsScreen() {
  const [catalog, setCatalog] = useState<RetailerInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState({ totalAvailable: 0, totalConnected: 0, totalReceipts: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const [connectModal, setConnectModal] = useState<RetailerInfo | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiGet("/api/mobile/retailers");
      setCatalog(data.catalog);
      setCategories(data.categories);
      setSummary(data.summary);
    } catch (err) {
      console.error("Failed to fetch retailers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async (retailerId?: string) => {
    setSyncing(retailerId ?? "all");
    try {
      await apiPost("/api/mobile/retailers/sync", retailerId ? { retailer: retailerId } : {});
      Alert.alert("Syncing", retailerId ? `Syncing ${retailerId}...` : "Syncing all retailers...");
    } catch (err) {
      Alert.alert("Error", "Failed to trigger sync");
    } finally {
      setTimeout(() => setSyncing(null), 2000);
    }
  };

  const handleDisconnect = (retailer: RetailerInfo) => {
    Alert.alert(
      `Disconnect ${retailer.name}?`,
      "Your existing receipts will be kept, but no new data will be synced.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await apiDelete(`/api/mobile/retailers?retailer=${retailer.id}`);
              fetchData();
            } catch (err) {
              Alert.alert("Error", "Failed to disconnect");
            }
          },
        },
      ]
    );
  };

  // Filter retailers
  const filteredRetailers = catalog.filter((r) => {
    const matchesSearch = searchQuery === "" ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "popular"
      ? r.popular
      : r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const connectedRetailers = catalog.filter((r) => r.connected);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      <View style={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>Connections</Text>
        <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Connect your accounts to automatically import receipts
        </Text>

        {/* Stats Bar */}
        <Card variant="elevated" style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#171717" }}>
                {summary.totalConnected}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>Connected</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#f3f4f6" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#171717" }}>
                {summary.totalReceipts}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>Receipts</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#f3f4f6" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#171717" }}>
                {summary.totalAvailable}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>Available</Text>
            </View>
          </View>
        </Card>

        {/* Sync All Button */}
        {connectedRetailers.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSync()}
            style={{
              marginTop: 12,
              backgroundColor: "#171717",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            {syncing === "all" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Sync All ({connectedRetailers.length} retailers)
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Connected Retailers */}
        {connectedRetailers.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Connected
            </Text>
            <Card variant="outlined" padding={0} style={{ overflow: "hidden" }}>
              {connectedRetailers.map((retailer, idx) => (
                <TouchableOpacity
                  key={retailer.id}
                  onLongPress={() => handleDisconnect(retailer)}
                  onPress={() => handleSync(retailer.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderBottomWidth: idx < connectedRetailers.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{retailer.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#171717" }}>
                      {retailer.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                      {retailer.receiptCount} receipts
                      {retailer.lastSyncAt ? ` • Synced ${formatTimeAgo(retailer.lastSyncAt)}` : ""}
                    </Text>
                  </View>
                  {syncing === retailer.id ? (
                    <ActivityIndicator size="small" color="#171717" />
                  ) : (
                    <View style={{ backgroundColor: "#dcfce7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </Card>
            <Text style={{ fontSize: 11, color: "#d1d5db", marginTop: 6, textAlign: "center" }}>
              Long press to disconnect • Tap to sync
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={{ marginTop: 24 }}>
          <TextInput
            placeholder="Search retailers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 12,
              fontSize: 15,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedCategory === cat.id ? "#171717" : "#fff",
                borderWidth: 1,
                borderColor: selectedCategory === cat.id ? "#171717" : "#e5e7eb",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: selectedCategory === cat.id ? "#fff" : "#6b7280",
                }}
              >
                {cat.icon} {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Retailer Grid */}
        <View style={{ marginTop: 16 }}>
          {filteredRetailers.map((retailer) => (
            <TouchableOpacity
              key={retailer.id}
              onPress={() => {
                if (retailer.connected) {
                  handleSync(retailer.id);
                } else {
                  setConnectModal(retailer);
                }
              }}
              style={{ marginBottom: 10 }}
            >
              <Card variant="outlined" padding={14}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: `${retailer.color}15`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{retailer.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#171717" }}>
                      {retailer.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }} numberOfLines={1}>
                      {retailer.description}
                    </Text>
                  </View>
                  {retailer.connected ? (
                    <View style={{ backgroundColor: "#dcfce7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>Connected</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: "#171717", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Connect</Text>
                    </View>
                  )}
                </View>
                {/* Data types */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 4 }}>
                  {retailer.dataTypes.slice(0, 4).map((dt) => (
                    <View
                      key={dt}
                      style={{
                        backgroundColor: "#f3f4f6",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#6b7280" }}>{dt}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {filteredRetailers.length === 0 && (
          <Text style={{ textAlign: "center", color: "#9ca3af", marginTop: 32, fontSize: 14 }}>
            No retailers found matching "{searchQuery}"
          </Text>
        )}

        {/* Network Stats */}
        <Card variant="outlined" style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#171717", marginBottom: 8 }}>
            Universal Receipt Network
          </Text>
          <Text style={{ fontSize: 12, color: "#6b7280", lineHeight: 18 }}>
            Connect all your retailers to build a complete picture of your spending.
            We support {summary.totalAvailable}+ retailers with more added weekly.
            Your data is encrypted and never shared without your permission.
          </Text>
        </Card>
      </View>

      {/* Connect Modal */}
      <ConnectModal
        retailer={connectModal}
        onClose={() => setConnectModal(null)}
        onConnect={async (authToken, meta) => {
          if (!connectModal) return;
          try {
            await apiPost("/api/mobile/retailers", {
              retailer: connectModal.id,
              authToken,
              ...meta,
            });
            setConnectModal(null);
            fetchData();
            Alert.alert("Connected!", `${connectModal.name} is now linked. Syncing receipts...`);
            handleSync(connectModal.id);
          } catch (err) {
            Alert.alert("Error", "Failed to connect. Please try again.");
          }
        }}
      />
    </ScrollView>
  );
}

function ConnectModal({
  retailer,
  onClose,
  onConnect,
}: {
  retailer: RetailerInfo | null;
  onClose: () => void;
  onConnect: (authToken: string, meta?: any) => void;
}) {
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(false);

  if (!retailer) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: "#fafafa", padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#171717" }}>
            Connect {retailer.name}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: "#6b7280" }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center", marginTop: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: `${retailer.color}15`,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 36 }}>{retailer.icon}</Text>
          </View>
          <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 12, textAlign: "center" }}>
            {retailer.description}
          </Text>
        </View>

        <View style={{ marginTop: 32 }}>
          {retailer.authMethod === "oauth" ? (
            <TouchableOpacity
              onPress={() => {
                // Trigger OAuth flow via WebBrowser
                onConnect("oauth-flow-placeholder");
              }}
              style={{
                backgroundColor: retailer.color,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Sign in with {retailer.name}
              </Text>
            </TouchableOpacity>
          ) : retailer.authMethod === "upload" ? (
            <View>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
                {retailer.name} doesn't have a digital receipt system. You can:
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#171717",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Scan a Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                }}
              >
                <Text style={{ fontWeight: "700", color: "#171717" }}>Forward Email Receipts</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                Enter your {retailer.name} session token to connect:
              </Text>
              <TextInput
                placeholder="Paste session token or cookie..."
                value={authToken}
                onChangeText={setAuthToken}
                multiline
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  padding: 12,
                  minHeight: 80,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  fontFamily: "monospace",
                }}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!authToken.trim()) return;
                  setLoading(true);
                  await onConnect(authToken.trim());
                  setLoading(false);
                }}
                disabled={!authToken.trim() || loading}
                style={{
                  backgroundColor: authToken.trim() ? "#171717" : "#e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: authToken.trim() ? "#fff" : "#9ca3af", fontWeight: "700", fontSize: 15 }}>
                    Connect
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Data types section */}
        <View style={{ marginTop: 32 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 8 }}>
            Data we'll import:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {retailer.dataTypes.map((dt) => (
              <View
                key={dt}
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 12, color: "#374151" }}>{dt}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
