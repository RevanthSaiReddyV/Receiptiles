import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { apiPost, apiGet } from "../lib/api";

const { width } = Dimensions.get("window");

const ONBOARDING_STEPS = [
  {
    icon: "🧾",
    title: "Your Universal\nReceipt Wallet",
    subtitle:
      "One place for every purchase. Across every retailer. Completely automatic.",
    accentColor: "#89f6a6",
  },
  {
    icon: "📧",
    title: "Connect Gmail\nGet 2 Years of Receipts",
    subtitle:
      "We find receipts from Amazon, Uber, DoorDash, Target & 15+ retailers instantly.",
    accentColor: "#6fdc8f",
    action: "gmail",
  },
  {
    icon: "🏪",
    title: "Connect Retailers\nDirectly",
    subtitle:
      "Link Costco, Walmart, Kroger & more for item-level receipt data.",
    accentColor: "#e6c279",
    action: "retailers",
  },
  {
    icon: "💳",
    title: "Maximize Your\nCard Rewards",
    subtitle:
      "We tell you which card to use at every store to maximize cashback & points.",
    accentColor: "#89f6a6",
    action: "done",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [receiptCount, setReceiptCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentStep = ONBOARDING_STEPS[step];

  const animateTransition = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setStep(next), 150);
  };

  const goNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      animateTransition(step + 1);
    }
  };

  const handleGmailConnect = async () => {
    setGmailConnecting(true);
    try {
      const { url } = await apiGet<{ url: string }>("/api/mobile/gmail/auth-url");
      const result = await WebBrowser.openAuthSessionAsync(url, "receipts://gmail-callback");

      if (result.type === "success" && result.url) {
        const callbackUrl = new URL(result.url);
        const code = callbackUrl.searchParams.get("code");

        if (code) {
          const response = await apiPost<{ connected: boolean; receiptsFound: number }>(
            "/api/mobile/gmail/connect",
            { code }
          );
          setGmailConnected(true);
          setReceiptCount(response.receiptsFound ?? 0);
          setTimeout(goNext, 1500);
        }
      }
    } catch {
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
        router.push("/connections");
        break;
      case "done":
        router.replace("/(tabs)");
        break;
      default:
        goNext();
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Progress dots */}
      <View style={s.dotsRow}>
        {ONBOARDING_STEPS.map((_, idx) => (
          <View
            key={idx}
            style={[
              s.dot,
              idx === step ? [s.dotActive, { backgroundColor: currentStep.accentColor }] : null,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <Animated.View style={[s.content, { opacity: fadeAnim }]}>
        <View style={[s.iconCircle, { backgroundColor: currentStep.accentColor + "20" }]}>
          <Text style={s.icon}>{currentStep.icon}</Text>
        </View>
        <Text style={s.title}>{currentStep.title}</Text>
        <Text style={s.subtitle}>{currentStep.subtitle}</Text>

        {currentStep.action === "gmail" && gmailConnected && (
          <View style={s.successBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#006d36" />
            <Text style={s.successText}>
              Connected! Found {receiptCount} receipts
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Actions */}
      <View style={[s.actions, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          onPress={handleAction}
          disabled={gmailConnecting}
          style={[s.primaryButton, { backgroundColor: currentStep.accentColor }]}
          activeOpacity={0.8}
        >
          {gmailConnecting ? (
            <ActivityIndicator color="#101814" />
          ) : (
            <Text style={s.primaryButtonText}>
              {currentStep.action === "gmail" && !gmailConnected
                ? "Connect Gmail"
                : currentStep.action === "retailers"
                  ? "Browse Retailers"
                  : currentStep.action === "done"
                    ? "Start Using Receiptiles"
                    : "Continue"}
            </Text>
          )}
        </TouchableOpacity>

        {currentStep.action && currentStep.action !== "done" && !gmailConnected && (
          <TouchableOpacity onPress={handleSkip} style={s.skipButton}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        {!currentStep.action && (
          <TouchableOpacity onPress={goNext} style={s.skipButton}>
            <Text style={s.skipText}>
              {step === 0 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f5",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c3c8c3",
  },
  dotActive: {
    width: 28,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#101814",
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#434845",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: "#89f6a6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  successText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#006d36",
  },
  actions: {
    padding: 24,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#101814",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  skipButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    color: "#747874",
    fontSize: 15,
    fontWeight: "500",
  },
});
