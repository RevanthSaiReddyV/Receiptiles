import { View, TouchableOpacity, Text, Animated, Dimensions, StyleSheet } from "react-native";
import { useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TabItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  { name: "index", label: "Home", icon: "home-outline", iconActive: "home" },
  { name: "budgets", label: "Budget", icon: "pie-chart-outline", iconActive: "pie-chart" },
  { name: "upload", label: "Scan", icon: "scan-outline", iconActive: "scan" },
  { name: "rewards", label: "Rewards", icon: "card-outline", iconActive: "card" },
  { name: "settings", label: "More", icon: "ellipsis-horizontal", iconActive: "ellipsis-horizontal-circle" },
];

const TAB_WIDTH = SCREEN_WIDTH / TABS.length;
const INDICATOR_WIDTH = 40;
const ACCENT = "#171717";

interface Props {
  activeIndex: number;
  onTabPress: (index: number) => void;
}

export function AnimatedTabBar({ activeIndex, onTabPress }: Props) {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [activeIndex]);

  const handlePress = (index: number) => {
    if (index === activeIndex) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();

    onTabPress(index);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.indicator,
          { transform: [{ translateX: indicatorAnim }] },
        ]}
      />
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => handlePress(index)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? ACCENT : "#9ca3af"}
              />
            </Animated.View>
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingBottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: INDICATOR_WIDTH,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
  },
  labelActive: {
    color: ACCENT,
  },
});
