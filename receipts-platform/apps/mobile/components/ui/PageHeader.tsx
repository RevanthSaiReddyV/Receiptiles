import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    onPress: () => void;
  };
}

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  showBack,
  rightAction,
}: PageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color="#1C1C1A" />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.rightAction}
            activeOpacity={0.7}
          >
            {rightAction.icon && (
              <Ionicons name={rightAction.icon} size={20} color="#4A5D4E" />
            )}
            {rightAction.label && (
              <Text style={styles.rightLabel}>{rightAction.label}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F7F6F2",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#242D28",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1C1A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#82907A",
    marginTop: 2,
  },
  rightAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#7BE899",
    gap: 6,
  },
  rightLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A5D4E",
  },
});
