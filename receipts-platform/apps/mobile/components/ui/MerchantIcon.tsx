import { View, Text } from "react-native";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Dining: { bg: "#fef3c7", text: "#d97706" },
  Groceries: { bg: "#d1fae5", text: "#059669" },
  Gas: { bg: "#e0e7ff", text: "#4f46e5" },
  Shopping: { bg: "#fce7f3", text: "#db2777" },
  Travel: { bg: "#dbeafe", text: "#2563eb" },
  Flights: { bg: "#dbeafe", text: "#2563eb" },
  Hotels: { bg: "#dbeafe", text: "#2563eb" },
  Transit: { bg: "#e0e7ff", text: "#4f46e5" },
  Entertainment: { bg: "#f3e8ff", text: "#9333ea" },
  Streaming: { bg: "#f3e8ff", text: "#9333ea" },
  Drugstores: { bg: "#fce7f3", text: "#be185d" },
  Fitness: { bg: "#ccfbf1", text: "#0d9488" },
  Utilities: { bg: "#f1f5f9", text: "#475569" },
  Phone: { bg: "#f1f5f9", text: "#475569" },
  Internet: { bg: "#f1f5f9", text: "#475569" },
  Insurance: { bg: "#fef3c7", text: "#b45309" },
  "EV Charging": { bg: "#d1fae5", text: "#059669" },
};

interface MerchantIconProps {
  name: string;
  category?: string;
  size?: number;
}

export function MerchantIcon({ name, category, size = 40 }: MerchantIconProps) {
  const colors = CATEGORY_COLORS[category ?? "Shopping"] ?? {
    bg: "#f3f4f6",
    text: "#6b7280",
  };

  // Get initials (first letter of first two words)
  const initials = name
    .split(/[\s\-&]+/)
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.36,
          fontWeight: "700",
          color: colors.text,
        }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}
