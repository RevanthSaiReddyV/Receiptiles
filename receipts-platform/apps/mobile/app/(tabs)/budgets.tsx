import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../lib/config-provider";
import Svg, { Circle } from "react-native-svg";
import { api } from "../../lib/api";
import { useFadeInUp } from "../../lib/animations";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  progress: number;
  remaining: number;
  dailyBudget: number;
  isOverBudget: boolean;
}

interface Summary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  progress: number;
  period: string;
}

const CATEGORY_OPTIONS = [
  "Dining",
  "Groceries",
  "Gas",
  "Shopping",
  "Travel",
  "Entertainment",
  "Streaming",
  "Transit",
  "Drugstores",
  "Fitness",
  "Utilities",
  "Phone",
  "Internet",
  "Insurance",
  "Other",
];

const CATEGORY_EMOJI: Record<string, string> = {
  Dining: "🍽️",
  Groceries: "🛒",
  Gas: "⛽",
  Shopping: "🛍️",
  Travel: "✈️",
  Entertainment: "🎬",
  Streaming: "📺",
  Transit: "🚗",
  Drugstores: "💊",
  Fitness: "💪",
  Utilities: "💡",
  Phone: "📱",
  Internet: "🌐",
  Insurance: "🛡️",
  Other: "📦",
};

// Stitch palette
const COLORS = {
  background: "#faf9f5",
  card: "#ffffff",
  border: "#c3c8c3",
  primary: "#101814",
  muted: "#434845",
  secondaryGreen: "#006d36",
  progressGreen: "#6fdc8f",
  nearLimitGold: "#ffdfa0",
  error: "#ba1a1a",
  track: "#e3e2df",
};

const RING_SIZE = 256;
const RING_STROKE = 16;

function BudgetRing({ progress }: { progress: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: clampedProgress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        stroke={COLORS.track}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        stroke={COLORS.progressGreen}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
      />
    </Svg>
  );
}

function getCategoryStatus(progress: number): {
  label: string;
  color: string;
} {
  if (progress > 1) return { label: "Over limit", color: COLORS.error };
  if (progress > 0.7) return { label: "Near limit", color: "#b8860b" };
  return { label: "On track", color: COLORS.secondaryGreen };
}

function getBarColor(progress: number): string {
  if (progress > 1) return COLORS.error;
  if (progress > 0.7) return COLORS.nearLimitGold;
  return COLORS.progressGreen;
}

const SUGGESTED_BUDGETS = [
  { category: "Dining", emoji: "\u{1F37D}️", limit: "500" },
  { category: "Groceries", emoji: "\u{1F6D2}", limit: "400" },
  { category: "Shopping", emoji: "\u{1F6CD}️", limit: "300" },
  { category: "Transit", emoji: "\u{1F697}", limit: "200" },
];

function EmptyState({
  onSelectCategory,
  onCreateCustom,
}: {
  onSelectCategory: (category: string, limit: string) => void;
  onCreateCustom: () => void;
}) {
  const ringAnim = useFadeInUp(0);
  const textAnim = useFadeInUp(150);
  const card0Anim = useFadeInUp(200);
  const card1Anim = useFadeInUp(250);
  const card2Anim = useFadeInUp(300);
  const card3Anim = useFadeInUp(350);
  const buttonAnim = useFadeInUp(400);
  const cardAnims = [card0Anim, card1Anim, card2Anim, card3Anim];

  const emptyRadius = (RING_SIZE - RING_STROKE) / 2;
  const emptyCircumference = emptyRadius * 2 * Math.PI;
  // 2% progress sliver
  const sliverOffset = emptyCircumference * (1 - 0.02);

  return (
    <View style={emptyStyles.container}>
      {/* Animated Ring */}
      <Animated.View style={[emptyStyles.ringWrapper, ringAnim]}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={emptyRadius}
            stroke={COLORS.track}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={emptyRadius}
            stroke={COLORS.progressGreen}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={emptyCircumference}
            strokeDashoffset={sliverOffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={emptyStyles.ringCenterText}>
          <Text style={emptyStyles.ringPercent}>0%</Text>
          <Text style={emptyStyles.ringSetup}>Set up budgets</Text>
        </View>
      </Animated.View>

      {/* Headline + Body */}
      <Animated.View style={[emptyStyles.textContainer, textAnim]}>
        <Text style={emptyStyles.headline}>Take control of your spending</Text>
        <Text style={emptyStyles.body}>
          Set category budgets and we'll track them automatically from your receipts.
        </Text>
      </Animated.View>

      {/* Suggested Category Grid (2x2) */}
      <View style={emptyStyles.grid}>
        {SUGGESTED_BUDGETS.map((item, index) => (
          <Animated.View key={item.category} style={[emptyStyles.gridCard, cardAnims[index]]}>
            <TouchableOpacity
              onPress={() => onSelectCategory(item.category, item.limit)}
              activeOpacity={0.7}
              style={emptyStyles.gridCardInner}
            >
              <Text style={emptyStyles.gridEmoji}>{item.emoji}</Text>
              <Text style={emptyStyles.gridCategory}>{item.category}</Text>
              <Text style={emptyStyles.gridSuggested}>Suggested: ${item.limit}/mo</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Create Custom Budget Button */}
      <Animated.View style={[emptyStyles.buttonWrapper, buttonAnim]}>
        <TouchableOpacity
          onPress={onCreateCustom}
          style={emptyStyles.customButton}
          activeOpacity={0.7}
        >
          <Text style={emptyStyles.customButtonText}>Create Custom Budget</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  ringWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
  },
  ringPercent: {
    fontSize: 42,
    fontWeight: "800",
    color: COLORS.primary,
  },
  ringSetup: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  headline: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
    marginBottom: 24,
  },
  gridCard: {
    width: (Dimensions.get("window").width - 40 - 12) / 2,
  },
  gridCardInner: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  gridEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  gridCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 4,
  },
  gridSuggested: {
    fontSize: 13,
    color: COLORS.muted,
  },
  buttonWrapper: {
    width: "100%",
  },
  customButton: {
    backgroundColor: "#242d28",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },
  customButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ budgets: Budget[]; summary: Summary }>(
        "/api/mobile/budgets"
      );
      setBudgets(data.budgets);
      setSummary(data.summary);
    } catch (e) {
      console.warn("Budget load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!newCategory || !newLimit) {
      Alert.alert("Error", "Select a category and enter a limit.");
      return;
    }
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert("Error", "Enter a valid dollar amount.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/mobile/budgets", {
        method: "POST",
        body: JSON.stringify({ category: newCategory, monthlyLimit: limit }),
      });
      setShowAdd(false);
      setNewCategory("");
      setNewLimit("");
      load();
    } catch {
      Alert.alert("Error", "Failed to create budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert("Remove Budget", `Remove ${budget.category} budget?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/mobile/budgets", {
              method: "DELETE",
              body: JSON.stringify({ category: budget.category }),
            });
            load();
          } catch {
            Alert.alert("Error", "Failed to delete budget.");
          }
        },
      },
    ]);
  };

  const dailyAvg =
    summary && summary.totalBudget > 0
      ? (summary.totalSpent / Math.max(new Date().getDate(), 1)).toFixed(2)
      : "0.00";

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Budgets</Text>
          <Text style={styles.subtitle}>Monthly Overview</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={styles.addButton}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Overview Card */}
      {summary && summary.totalBudget > 0 && (
        <View style={styles.overviewCard}>
          {/* Decorative blurred circle */}
          <View style={styles.decorativeCircle} />

          {/* Ring + Center Text */}
          <View style={styles.ringContainer}>
            <BudgetRing progress={summary.progress} />
            <View style={styles.ringCenterText}>
              <Text style={styles.ringLabel}>SPENT</Text>
              <Text style={styles.ringAmount}>
                ${summary.totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.ringSubtext}>
                of ${summary.totalBudget.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          {/* Side Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: COLORS.secondaryGreen }]}>
                ${summary.totalRemaining.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Daily Avg</Text>
              <Text style={styles.statValue}>${dailyAvg}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.checkIcon}>
                  {summary.progress <= 0.8 ? "✓" : summary.progress <= 1 ? "!" : "✗"}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        summary.progress <= 0.8
                          ? COLORS.secondaryGreen
                          : summary.progress <= 1
                          ? "#b8860b"
                          : COLORS.error,
                    },
                  ]}
                >
                  {summary.progress <= 0.8
                    ? "On Track"
                    : summary.progress <= 1
                    ? "Near Limit"
                    : "Over Budget"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Categories Section */}
      {budgets.length > 0 && (
        <View style={styles.categoriesHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={styles.smallAddButton}
            activeOpacity={0.7}
          >
            <Text style={styles.smallAddButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Cards */}
      <View style={styles.categoriesGrid}>
        {budgets.map((budget) => {
          const status = getCategoryStatus(budget.progress);
          const barColor = getBarColor(budget.progress);
          const transactionCount = Math.max(
            Math.floor(budget.spent / 25),
            1
          ); // rough estimate

          return (
            <TouchableOpacity
              key={budget.id}
              onLongPress={() => handleDelete(budget)}
              activeOpacity={0.8}
              style={styles.categoryCard}
            >
              {/* Top Row */}
              <View style={styles.categoryTopRow}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: barColor + "22" },
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>
                      {CATEGORY_EMOJI[budget.category] || "📦"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.categoryName}>{budget.category}</Text>
                    <Text style={styles.categoryTransactions}>
                      {transactionCount} Transaction{transactionCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categorySpent}>
                    ${budget.spent.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={styles.categoryLimit}>
                    of ${budget.monthlyLimit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(budget.progress * 100, 100)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              {/* Status */}
              <Text style={[styles.categoryStatus, { color: status.color }]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Empty State */}
      {budgets.length === 0 && (
        <EmptyState
          onSelectCategory={(category, limit) => {
            setNewCategory(category);
            setNewLimit(limit);
            setShowAdd(true);
          }}
          onCreateCustom={() => setShowAdd(true)}
        />
      )}

      {/* Add Budget Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Budget</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {CATEGORY_OPTIONS.filter(
              (cat) => !budgets.some((b) => b.category === cat)
            ).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setNewCategory(cat)}
                style={[
                  styles.categoryChip,
                  newCategory === cat && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    newCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {CATEGORY_EMOJI[cat]} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.modalLabel, { marginTop: 24 }]}>Monthly Limit</Text>
          <View style={styles.limitInput}>
            <Text style={styles.limitDollar}>$</Text>
            <TextInput
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={COLORS.muted}
              style={styles.limitField}
            />
          </View>

          {/* Quick presets */}
          <View style={styles.presets}>
            {["100", "200", "300", "500"].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setNewLimit(val)}
                style={[
                  styles.presetChip,
                  newLimit === val && styles.presetChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    newLimit === val && styles.presetChipTextActive,
                  ]}
                >
                  ${val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            disabled={saving || !newCategory || !newLimit}
            style={[
              styles.createButton,
              (saving || !newCategory || !newLimit) && { opacity: 0.5 },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>
              {saving ? "Creating..." : "Create Budget"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "600",
    marginTop: -1,
  },

  // Monthly Overview Card
  overviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 32,
  },
  decorativeCircle: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.progressGreen,
    opacity: 0.1,
  },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
  },
  ringLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: COLORS.muted,
    textTransform: "uppercase",
  },
  ringAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 4,
  },
  ringSubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checkIcon: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondaryGreen,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Categories Section
  categoriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  smallAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAddButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: -1,
  },

  // Category Cards
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  categoryTransactions: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: "flex-end",
  },
  categorySpent: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  categoryLimit: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  categoryStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  // Empty State
  emptyState: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primary,
  },
  modalCancel: {
    color: COLORS.muted,
    fontSize: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 24,
  },
  categoryScroll: {
    marginTop: 10,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  limitInput: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  limitDollar: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
  },
  limitField: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    marginLeft: 4,
    flex: 1,
  },
  presets: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.track,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
  },
  presetChipText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  presetChipTextActive: {
    color: "#ffffff",
  },
  createButton: {
    marginTop: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  createButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
