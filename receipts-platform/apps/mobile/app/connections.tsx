import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../lib/config-provider";
import { create, open, LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";
import { api, apiPost } from "../lib/api";

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [isConnecting, setIsConnecting] = useState(false);
  const [bankConnected, setBankConnected] = useState(false);

  const handleConnectBank = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { linkToken } = await api<{ linkToken: string }>("/api/plaid/link-token", { method: "POST" });
      create({ token: linkToken, noLoadingState: false });
      open({
        onSuccess: async (success: LinkSuccess) => {
          try {
            await apiPost("/api/plaid/exchange", { publicToken: success.publicToken, institutionName: success.metadata?.institution?.name ?? "Bank" });
            setBankConnected(true);
          } catch { Alert.alert("Error", "Failed to connect bank account."); }
          setIsConnecting(false);
        },
        onExit: (exit: LinkExit) => { setIsConnecting(false); },
      });
    } catch { Alert.alert("Error", "Failed to initialize connection."); setIsConnecting(false); }
  }, []);

  const connections = [
    { name: "Bank Account", icon: "🏦", desc: bankConnected ? "Connected" : "Match transactions with receipts", connected: bankConnected, action: handleConnectBank },
    { name: "Gmail", icon: "📧", desc: "Auto-import receipt emails", connected: false },
    { name: "Wallet Pass", icon: "💳", desc: "Tap to receive receipts", connected: false },
  ];

  const retailers = [
    { name: "Amazon", icon: "📦" },
    { name: "Target", icon: "🎯" },
    { name: "Walmart", icon: "🛒" },
    { name: "Costco", icon: "🏪" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: 40 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.onSurface, letterSpacing: -0.5 }}>Connections</Text>
      <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 24 }}>Link accounts to automatically import receipts.</Text>

      {connections.map((c) => (
        <View key={c.name} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 20 }}>{c.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.onSurface }}>{c.name}</Text>
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>{c.desc}</Text>
          </View>
          {c.connected ? (
            <View style={{ backgroundColor: colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.secondary }}>Connected</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={c.action} disabled={isConnecting} style={{ backgroundColor: colors.secondary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
              {isConnecting && c.action ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#101814", fontSize: 13, fontWeight: "600" }}>Connect</Text>}
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.onSurface, marginTop: 28 }}>Retailers</Text>
      <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 12 }}>Connect store accounts for automatic import</Text>

      {retailers.map((r) => (
        <View key={r.name} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 16 }}>{r.icon}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.onSurface }}>{r.name}</Text>
          <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>Coming soon</Text>
        </View>
      ))}
    </ScrollView>
  );
}
