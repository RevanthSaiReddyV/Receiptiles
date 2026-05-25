import { Tabs } from "expo-router";
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { useRef, useEffect, useCallback, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "../../lib/config-provider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Color palette
const COLORS = {
  tabBarBg: "rgba(250, 249, 245, 0.92)",
  activeIndicator: "#7BE899",
  activeIcon: "#006d36",
  inactiveIcon: "#747874",
  activeLabel: "#1C1C1A",
  inactiveLabel: "#747874",
  scanBg: "#7BE899",
  scanIcon: "#FFFFFF",
  border: "rgba(227, 226, 223, 0.5)",
};

const TABS = [
  { name: "index", label: "Home", icon: "home-outline" as const, iconActive: "home" as const },
  { name: "receipts", label: "Receipts", icon: "receipt-outline" as const, iconActive: "receipt" as const },
  { name: "insights", label: "AI Insights", icon: "sparkles-outline" as const, iconActive: "sparkles" as const },
  { name: "rewards", label: "Rewards", icon: "star-outline" as const, iconActive: "star" as const },
  { name: "settings", label: "Settings", icon: "settings-outline" as const, iconActive: "settings" as const },
];

const TAB_COUNT = TABS.length;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;
const INDICATOR_WIDTH = 24;
const SCAN_TAB_INDEX = -1;
const SCAN_CIRCLE_SIZE = 52;
const BOTTOM_PADDING = Platform.OS === "ios" ? 34 : 16;

const CustomTabBar = memo(function CustomTabBar({ state, navigation }: any) {
  const colors = useColors();
  const visibleTabs = TABS;
  const activeIndex = state.routes.findIndex(
    (route: any) => route.name === visibleTabs[state.index]?.name
  ) === -1
    ? (() => {
        // Map the router state index to our visible tabs
        const routeName = state.routes[state.index]?.name;
        const idx = visibleTabs.findIndex((t) => t.name === routeName);
        return idx >= 0 ? idx : 0;
      })()
    : (() => {
        const routeName = state.routes[state.index]?.name;
        const idx = visibleTabs.findIndex((t) => t.name === routeName);
        return idx >= 0 ? idx : 0;
      })();

  const indicatorAnim = useRef(
    new Animated.Value(activeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2)
  ).current;
  const scaleAnims = useRef(visibleTabs.map(() => new Animated.Value(1))).current;
  const activeScaleAnims = useRef(
    visibleTabs.map((_, i) => new Animated.Value(i === activeIndex ? 1.05 : 1.0))
  ).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();

    // Subtle scale lift for active tab icon
    visibleTabs.forEach((_, i) => {
      Animated.spring(activeScaleAnims[i], {
        toValue: i === activeIndex ? 1.05 : 1.0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    });
  }, [activeIndex]);

  const handlePress = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.sequence([
        Animated.timing(scaleAnims[index], {
          toValue: 0.85,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 100,
        }),
      ]).start();

      const tab = visibleTabs[index];
      navigation.navigate(tab.name);
    },
    [activeIndex, navigation, scaleAnims, visibleTabs]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface + "EA", borderTopColor: colors.outlineVariant + "80" }]}>
      {/* Active indicator line at top */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: colors.secondary, transform: [{ translateX: indicatorAnim }] },
        ]}
      />

      {visibleTabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const isScanTab = index === SCAN_TAB_INDEX;

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => handlePress(index)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                { transform: [{ scale: Animated.multiply(scaleAnims[index], activeScaleAnims[index]) }] },
                isScanTab && styles.scanTabWrapper,
              ]}
            >
              {isScanTab ? (
                <View style={styles.scanCircle}>
                  <Ionicons
                    name={isActive ? tab.iconActive : tab.icon}
                    size={24}
                    color={COLORS.scanIcon}
                  />
                </View>
              ) : (
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={22}
                  color={isActive ? colors.secondary : colors.outline}
                />
              )}
            </Animated.View>
            <Text
              style={[
                styles.label,
                { color: colors.outline },
                isActive && [styles.labelActive, { color: colors.onSurface }],
                isScanTab && styles.scanLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="receipts" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="rewards" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="upload" options={{ href: null }} />
      <Tabs.Screen name="connections" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.tabBarBg,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: INDICATOR_WIDTH,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.activeIndicator,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 6,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.inactiveLabel,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: COLORS.activeLabel,
    fontWeight: "600",
  },
  scanTabWrapper: {
    marginTop: -18,
  },
  scanCircle: {
    width: SCAN_CIRCLE_SIZE,
    height: SCAN_CIRCLE_SIZE,
    borderRadius: SCAN_CIRCLE_SIZE / 2,
    backgroundColor: COLORS.scanBg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#89f6a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  scanLabel: {
    marginTop: 2,
  },
});
