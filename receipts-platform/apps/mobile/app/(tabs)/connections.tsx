import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useState, useCallback } from "react";
import { openLink, LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";
import { api, apiPost } from "../../lib/api";

export default function ConnectionsScreen() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [bankConnected, setBankConnected] = useState(false);
  const [transactionsCount, setTransactionsCount] = useState(0);

  const handleConnectBank = useCallback(async () => {
    setIsConnecting(true);

    try {
      const { linkToken } = await api<{ linkToken: string }>("/api/plaid/link-token", { method: "POST" });

      openLink({
        tokenConfig: { token: linkToken, noLoadingState: false },
        onSuccess: async (success: LinkSuccess) => {
          try {
            const result = await apiPost<{ transactionsImported: number }>("/api/plaid/exchange", {
              publicToken: success.publicToken,
              institutionName: success.metadata?.institution?.name ?? "Bank",
            });
            setBankConnected(true);
            setTransactionsCount(result.transactionsImported);
          } catch {
            Alert.alert("Error", "Failed to connect bank account. Please try again.");
          }
          setIsConnecting(false);
        },
        onExit: (exit: LinkExit) => {
          setIsConnecting(false);
          if (exit.error) {
            Alert.alert("Connection Cancelled", exit.error.displayMessage ?? "Please try again.");
          }
        },
      });
    } catch {
      Alert.alert("Error", "Failed to initialize bank connection.");
      setIsConnecting(false);
    }
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <View style={{ padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>Connections</Text>
        <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Link accounts to automatically import receipts and transactions.
        </Text>

        {/* Bank Connection */}
        <View style={{ marginTop: 24, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#f3f4f6" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 20 }}>🏦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#171717" }}>Bank Account</Text>
              <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {bankConnected ? `${transactionsCount} transactions synced` : "Match transactions with receipts"}
              </Text>
            </View>
            {bankConnected ? (
              <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>Connected</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleConnectBank}
                disabled={isConnecting}
                style={{ backgroundColor: "#4f46e5", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Connect</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 12 }}>
            Powered by Plaid · Bank-grade encryption · We never store your login
          </Text>
        </View>

        {/* Email Connection */}
        <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#f3f4f6" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#fef3c7", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 20 }}>📧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#171717" }}>Gmail / Email</Text>
              <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Auto-import receipts from email</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: "#171717", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Pass */}
        <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#f3f4f6" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#dcfce7", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 20 }}>💳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#171717" }}>Wallet Pass</Text>
              <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Tap to receive receipts at checkout</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: "#171717", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Retailers */}
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#171717", marginTop: 32 }}>Retailers</Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4, marginBottom: 12 }}>
          Connect store accounts for automatic receipt import
        </Text>

        {[
          { name: "Amazon", icon: "📦", color: "#fef3c7" },
          { name: "Target", icon: "🎯", color: "#fee2e2" },
          { name: "Walmart", icon: "🛒", color: "#dbeafe" },
          { name: "Costco", icon: "🏪", color: "#e0e7ff" },
        ].map((store) => (
          <View key={store.name} style={{ marginTop: 8, backgroundColor: "#fff", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#f3f4f6" }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: store.color, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 16 }}>{store.icon}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#171717" }}>{store.name}</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>Coming soon</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
