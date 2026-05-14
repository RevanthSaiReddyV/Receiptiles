import { View, Text } from "react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";

interface CreditCardProps {
  name: string;
  last4: string;
  network: string;
  issuer?: string | null;
  color?: string;
  compact?: boolean;
}

const NETWORK_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#1a1a1a",
  amex: "#006fcf",
  discover: "#ff6000",
};

const ISSUER_COLORS: Record<string, string> = {
  Chase: "#117aca",
  "Capital One": "#004879",
  Amex: "#006fcf",
  Citi: "#003b70",
  "Bank of America": "#e31837",
  "Wells Fargo": "#d71e28",
  Discover: "#ff6000",
  "US Bank": "#d12127",
  Apple: "#1a1a1a",
};

export function CreditCard({
  name,
  last4,
  network,
  issuer,
  color,
  compact = false,
}: CreditCardProps) {
  const cardColor =
    color || ISSUER_COLORS[issuer ?? ""] || NETWORK_COLORS[network] || "#374151";

  if (compact) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: cardColor,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <NetworkLogo network={network} size={20} />
        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
          •••• {last4}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 1.586, // Standard card ratio
        backgroundColor: cardColor,
        borderRadius: 16,
        padding: 20,
        justifyContent: "space-between",
      }}
    >
      {/* Top: Issuer */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            fontWeight: "600",
            letterSpacing: 0.5,
          }}
        >
          {issuer ?? name}
        </Text>
        <NetworkLogo network={network} size={32} />
      </View>

      {/* Bottom: Card number & name */}
      <View>
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "300",
            letterSpacing: 3,
            marginBottom: 8,
          }}
        >
          •••• •••• •••• {last4}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 12,
            fontWeight: "500",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {name}
        </Text>
      </View>
    </View>
  );
}

function NetworkLogo({ network, size }: { network: string; size: number }) {
  const n = network.toLowerCase();

  if (n === "visa") {
    return (
      <Text style={{ color: "#fff", fontSize: size * 0.6, fontWeight: "800", fontStyle: "italic" }}>
        VISA
      </Text>
    );
  }

  if (n === "mastercard") {
    return (
      <Svg width={size} height={size * 0.7} viewBox="0 0 40 28">
        <Circle cx="14" cy="14" r="12" fill="#eb001b" opacity={0.9} />
        <Circle cx="26" cy="14" r="12" fill="#f79e1b" opacity={0.9} />
      </Svg>
    );
  }

  if (n === "amex") {
    return (
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "800" }}>
        AMEX
      </Text>
    );
  }

  if (n === "discover") {
    return (
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "700" }}>
        DISCOVER
      </Text>
    );
  }

  return (
    <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "600" }}>
      {network.toUpperCase()}
    </Text>
  );
}
