import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { apiPost, apiGet } from "../lib/api";

const { width } = Dimensions.get("window");

const ONBOARDING_STEPS = [
  {
    icon: "🧾",
    title: "Your Universal\nReceipt Wallet",
    subtitle: "One place for every purchase.\nAcross every retailer. Automatic.",
    color: "#171717",
  },
  {
    icon: "📧",
    title: "Connect Gmail\nGet 2 Years of Receipts",
    subtitle: "We'll find receipts from Amazon, Uber,\nDoorDash, Target & 15+ retailers instantly.",
    color: "#4285F4",
    action: "gmail",
  },
  {
    icon: "🏪",
    title: "Connect Retailers\nDirectly",
    subtitle: "Link Costco, Walmart, Kroger & more\nfor item-level receipt data.",
    color: "#16a34a",
    action: "retailers",
  },
  {
    icon: "💳",
    title: "Optimize Your\nCard Rewards",
    subtitle: "We'll tell you which card to use at\nevery store to maximize cashback.",
    color: "#7c3aed",
    action: "done",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [receiptCount, setReceiptCount] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const currentStep = ONBOARDING_STEPS[step];

  const goNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      Animated.timing(slideAnim, {
        toValue: -(step + 1) * width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setStep(step + 1);
    }
  };

  const handleGmailConnect = async () => {
    setGmailConnecting(true);
    try {
      // Get OAuth URL from backend
      const { url } = await apiGet<{ url: string }>("/api/mobile/gmail/auth-url");

      // Open browser for Google OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        "receipts://gmail-callback"
      );

      if (result.type === "success" && result.url) {
        // Extract auth code from callback URL
        const callbackUrl = new URL(result.url);
        const code = callbackUrl.searchParams.get("code");

        if (code) {
          // Exchange code for tokens and start sync
          const response = await apiPost<{ connected: boolean; receiptsFound: number }>(
            "/api/mobile/gmail/connect",
            { code }
          );

          setGmailConnected(true);
          setReceiptCount(response.receiptsFound ?? 0);

          // Show success briefly then advance
          setTimeout(goNext, 1500);
        }
      }
    } catch (err) {
      Alert.alert("Connection Failed", "Could not connect Gmail. You can try again later in Settings.");
    } finally {
      setGmailConnecting(false);
    }
  };

  const handleSkip = () => {
    if (step === ONBOARDING_STEPS.length - 1) {
      router.replace("/(tabs)");
    } else {
      goNext();
    }
  };

  const handleAction = () => {
    switch (currentStep.action) {
      case "gmail":
        handleGmailConnect();
        break;
      case "retailers":
        router.push("/(tabs)/connections");
        break;
      case "done":
        router.replace("/(tabs)");
        break;
      default:
        goNext();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Progress dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", paddingTop: 60, gap: 8 }}>
        {ONBOARDING_STEPS.map((_, idx) => (
          <View
            key={idx}
            style={{
              width: idx === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: idx === step ? "#171717" : "#e5e7eb",
            }}
          />
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Text style={{ fontSize: 72, marginBottom: 24 }}>{currentStep.icon}</Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#171717",
            textAlign: "center",
            lineHeight: 36,
          }}
        >
          {currentStep.title}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6b7280",
            textAlign: "center",
            marginTop: 12,
            lineHeight: 24,
          }}
        >
          {currentStep.subtitle}
        </Text>

        {/* Gmail connected state */}
        {currentStep.action === "gmail" && gmailConnected && (
          <View style={{ marginTop: 24, alignItems: "center" }}>
            <Text style={{ fontSize: 48 }}>✅</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#16a34a", marginTop: 8 }}>
              Connected! Found {receiptCount} receipts
            </Text>
            <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
              Importing in background...
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={{ padding: 24, paddingBottom: 48 }}>
        <TouchableOpacity
          onPress={handleAction}
          disabled={gmailConnecting}
          style={{
            backgroundColor: currentStep.color,
            borderRadius: 14,
            padding: 18,
            alignItems: "center",
          }}
        >
          {gmailConnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>
              {currentStep.action === "gmail" && !gmailConnected
                ? "Connect Gmail"
                : currentStep.action === "retailers"
                  ? "Browse Retailers"
                  : currentStep.action === "done"
                    ? "Start Using Receipts"
                    : "Continue"}
            </Text>
          )}
        </TouchableOpacity>

        {currentStep.action && currentStep.action !== "done" && !gmailConnected && (
          <TouchableOpacity onPress={handleSkip} style={{ marginTop: 14, alignItems: "center" }}>
            <Text style={{ color: "#9ca3af", fontSize: 15 }}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
