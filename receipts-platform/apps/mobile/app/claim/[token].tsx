import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../lib/api";

type ClaimStatus = "loading" | "claiming" | "success" | "expired" | "error";

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<ClaimStatus>("loading");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) claimReceipt();
  }, [token]);

  const claimReceipt = async () => {
    setStatus("claiming");
    try {
      const result = await api<{ claimed: boolean; receiptId: string | null }>(
        "/api/mobile/claim",
        {
          method: "POST",
          body: JSON.stringify({ claimToken: token }),
        }
      );

      if (result.claimed) {
        setStatus("success");
        setReceiptId(result.receiptId);
      } else {
        setStatus("error");
        setError("Could not claim receipt");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("410") || message.includes("expired")) {
        setStatus("expired");
      } else {
        setStatus("error");
        setError(message);
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f9fafb",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      {status === "loading" || status === "claiming" ? (
        <>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 16, fontSize: 16, color: "#6b7280" }}>
            Claiming your receipt...
          </Text>
        </>
      ) : status === "success" ? (
        <>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>✓</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
            Receipt Claimed!
          </Text>
          <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
            Your digital receipt has been added to your account.
          </Text>
          {receiptId && (
            <TouchableOpacity
              onPress={() => router.replace(`/receipt/${receiptId}`)}
              style={{
                backgroundColor: "#000",
                borderRadius: 10,
                paddingHorizontal: 24,
                paddingVertical: 14,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                View Receipt
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
            <Text style={{ color: "#6b7280", fontSize: 14 }}>Go to Dashboard</Text>
          </TouchableOpacity>
        </>
      ) : status === "expired" ? (
        <>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⏱</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
            Link Expired
          </Text>
          <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
            This claim link has expired. Please tap the terminal again.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
            <Text style={{ color: "#000", fontWeight: "600" }}>Go to Dashboard</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
            Claim Failed
          </Text>
          <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
            {error ?? "Something went wrong. Please try again."}
          </Text>
          <TouchableOpacity
            onPress={claimReceipt}
            style={{
              backgroundColor: "#000",
              borderRadius: 10,
              paddingHorizontal: 24,
              paddingVertical: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
            <Text style={{ color: "#6b7280", fontSize: 14 }}>Go to Dashboard</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
