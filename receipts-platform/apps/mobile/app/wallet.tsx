import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app";

interface WalletPassInfo {
  serialNumber: string;
  downloadUrl?: string;
  saveLink?: string;
  pass?: {
    generic: {
      headerFields: Array<{ key: string; label: string; value: string }>;
      primaryFields: Array<{ key: string; label: string; value: string }>;
      secondaryFields: Array<{ key: string; label: string; value: string }>;
    };
  };
  passObject?: {
    header: { defaultValue: { value: string } };
    subheader?: { defaultValue: { value: string } };
    textModulesData: Array<{ header: string; body: string }>;
  };
}

export default function WalletScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [passInfo, setPassInfo] = useState<WalletPassInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPassInfo();
  }, []);

  const fetchPassInfo = async () => {
    try {
      const platform = Platform.OS === "ios" ? "apple" : "google";
      const data = await api<WalletPassInfo>(`/api/wallet/${platform}`);
      setPassInfo(data);
    } catch (err) {
      setError("Could not load wallet pass info");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWallet = async () => {
    if (!passInfo) return;

    if (Platform.OS === "ios" && passInfo.downloadUrl) {
      // Open the .pkpass download URL — iOS will prompt to add to Wallet
      await WebBrowser.openBrowserAsync(passInfo.downloadUrl);
    } else if (Platform.OS === "android" && passInfo.saveLink) {
      // Open Google Wallet save link
      await WebBrowser.openBrowserAsync(passInfo.saveLink);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 20 }}>
        {/* Pass Preview Card */}
        <View
          style={{
            backgroundColor: "#111827",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600", letterSpacing: 1 }}>
            MASTER RECEIPT PASS
          </Text>

          {Platform.OS === "ios" && passInfo?.pass ? (
            <>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 12 }}>
                {passInfo.pass.generic.primaryFields[0]?.value ?? "Receipts"}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 16, gap: 24 }}>
                {passInfo.pass.generic.headerFields.map((field) => (
                  <View key={field.key}>
                    <Text style={{ color: "#9ca3af", fontSize: 11 }}>{field.label}</Text>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                      {field.value}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", marginTop: 16, gap: 24 }}>
                {passInfo.pass.generic.secondaryFields.map((field) => (
                  <View key={field.key}>
                    <Text style={{ color: "#9ca3af", fontSize: 11 }}>{field.label}</Text>
                    <Text style={{ color: "#fff", fontSize: 14 }}>{field.value}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : passInfo?.passObject ? (
            <>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 12 }}>
                {passInfo.passObject.header.defaultValue.value}
              </Text>
              {passInfo.passObject.subheader && (
                <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                  {passInfo.passObject.subheader.defaultValue.value}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 12 }}>
              Your Digital Receipt Card
            </Text>
          )}

          <View
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: "#374151",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 11 }}>
              TAP AT TERMINALS TO RECEIVE DIGITAL RECEIPTS
            </Text>
          </View>
        </View>

        {/* Add to Wallet Button */}
        <TouchableOpacity
          onPress={handleAddToWallet}
          style={{
            backgroundColor: "#000",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            {Platform.OS === "ios" ? "   Add to Apple Wallet" : "🎫  Save to Google Wallet"}
          </Text>
        </TouchableOpacity>

        {/* Info Section */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontWeight: "600", fontSize: 15, marginBottom: 8 }}>
            How it works
          </Text>
          <InfoRow emoji="📱" text="Add the pass to your wallet once" />
          <InfoRow emoji="💳" text="Tap your phone at any compatible terminal" />
          <InfoRow emoji="🧾" text="Receipt appears instantly in your app" />
          <InfoRow emoji="🔄" text="Pass updates automatically with your latest purchases" />
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          <Text style={{ fontWeight: "600", fontSize: 15, marginBottom: 8 }}>
            Compatible Terminals
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 13, lineHeight: 20 }}>
            Works with any terminal running our receipt hardware or POS integration
            (Square, Toast, Shopify). The pass uses{" "}
            {Platform.OS === "ios" ? "Apple VAS protocol" : "Google Smart Tap"}{" "}
            for instant contactless delivery.
          </Text>
        </View>

        {error && (
          <Text style={{ color: "#dc2626", marginTop: 16, textAlign: "center" }}>
            {error}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Text style={{ fontSize: 16, marginRight: 10 }}>{emoji}</Text>
      <Text style={{ color: "#374151", fontSize: 14 }}>{text}</Text>
    </View>
  );
}
