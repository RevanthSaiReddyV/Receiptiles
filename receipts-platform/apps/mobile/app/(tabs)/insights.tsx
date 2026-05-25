import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../lib/config-provider";
import type { ThemeColors } from "../../lib/theme-colors";
import { SwipeableTipCards, DAILY_TIPS } from "../../components/ui/SwipeableTipCards";
import Svg, {
  Rect,
  Circle,
  Path,
  Text as SvgText,
  Line,
  G,
} from "react-native-svg";
import { api } from "../../lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Receipt {
  id: string;
  merchantCanonicalName: string | null;
  merchantRawName: string;
  merchantCategory: string | null;
  purchasedAt: string;
  total: number;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

// Chart-specific accent colors (not theme-dependent)
const CHART_COLORS = {
  chartBar: "#6fdc8f",
  chartLine: "#006d36",
  donutMint: "#89f6a6",
  donutDark: "#101814",
  donutSage: "#82907a",
  donutGold: "#e6c279",
  donutForest: "#242d28",
  highBadgeBg: "#ffdad6",
  highBadgeText: "#93000a",
  medBadgeBg: "#ffdfa0",
  medBadgeText: "#5b4304",
  posBadgeBg: "#89f6a6",
  posBadgeText: "#006d36",
  accentHigh: "#ba1a1a",
  accentMed: "#e6c279",
  accentPos: "#6fdc8f",
};

// Legacy alias used in styles (will be overridden inline)
const C = {
  bg: "#faf9f5",
  card: "#ffffff",
  border: "#c3c8c3",
  primary: "#101814",
  muted: "#434845",
  mutedLight: "#747874",
  ...CHART_COLORS,
  tipBg: "#f5f4f0",
};

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Time Period Chips ───────────────────────────────────────────────────────

const TIME_PERIODS = ["Year", "Quarter", "Month", "Week", "Day"];

// ─── Sample Data ─────────────────────────────────────────────────────────────

const WEEKLY_DATA = [
  { day: "Mon", spend: 120, transactions: 8 },
  { day: "Tue", spend: 185, transactions: 11 },
  { day: "Wed", spend: 95, transactions: 7 },
  { day: "Thu", spend: 210, transactions: 14 },
  { day: "Fri", spend: 158, transactions: 13 },
  { day: "Sat", spend: 310, transactions: 18 },
  { day: "Sun", spend: 110, transactions: 10 },
];

const CATEGORY_DATA = [
  { name: "Food & Dining", pct: 25, amount: 850, color: C.donutMint },
  { name: "Shopping", pct: 35, amount: 1200, color: C.donutDark },
  { name: "Transport", pct: 9, amount: 650, color: C.donutSage },
  { name: "Bills", pct: 19, amount: 420, color: C.donutGold },
  { name: "Entertainment", pct: 12, amount: 320, color: C.donutForest },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState("Week");
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await api<{ receipts: Receipt[] }>(
        "/api/mobile/receipts?limit=200"
      );
      setHasData(res.receipts && res.receipts.length > 0);
    } catch {
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={CHART_COLORS.chartLine} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onSurface }]}>AI Insights</Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Deep analytics powered by artificial intelligence to help you make
          smarter financial decisions
        </Text>
      </View>

      {!hasData && (
        <View style={[styles.emptyBanner, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Connect accounts to see insights.
          </Text>
        </View>
      )}

      {/* Financial Analytics Card */}
      <FinancialAnalyticsCard
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
        colors={colors}
      />

      {/* Monthly Spending Breakdown */}
      <MonthlyBreakdownCard colors={colors} />

      {/* Daily Tips — Swipeable Cards */}
      <View style={styles.sectionWrapper}>
        <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>Daily Lessons</Text>
        <Text style={[styles.sectionSubheading, { color: colors.onSurfaceVariant }]}>Swipe through today's financial tips</Text>
        <SwipeableTipCards tips={DAILY_TIPS} />
      </View>

      {/* AI Tip of the Day */}
      <AiTipCard colors={colors} />

      {/* Insight Cards */}
      <InsightCard
        accentColor={CHART_COLORS.accentHigh}
        badgeBg={CHART_COLORS.highBadgeBg}
        badgeTextColor={CHART_COLORS.highBadgeText}
        badgeLabel="High Priority"
        title="Savings Opportunity Detected"
        description="We found 3 subscriptions you haven't used in over 60 days. Cancelling them could save you $47/month."
        buttonLabel="Review Subscriptions"
        colors={colors}
      />
      <InsightCard
        accentColor={CHART_COLORS.accentMed}
        badgeBg={CHART_COLORS.medBadgeBg}
        badgeTextColor={CHART_COLORS.medBadgeText}
        badgeLabel="Medium Priority"
        title="Budget Alert: Shopping"
        description="Your shopping spending has exceeded your monthly budget by $400. Consider adjusting your budget or spending habits."
        buttonLabel="View Details"
        colors={colors}
      />
      <InsightCard
        accentColor={CHART_COLORS.accentPos}
        badgeBg={CHART_COLORS.posBadgeBg}
        badgeTextColor={CHART_COLORS.posBadgeText}
        badgeLabel="Positive"
        title="Emergency Fund Goal"
        description="Great progress! You're 65% towards your $10,000 emergency fund goal. At this rate, you'll reach it in 4 months."
        buttonLabel="Track Progress"
        colors={colors}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Financial Analytics Card ────────────────────────────────────────────────

function FinancialAnalyticsCard({
  selectedPeriod,
  onSelectPeriod,
  colors,
}: {
  selectedPeriod: string;
  onSelectPeriod: (p: string) => void;
  colors: ThemeColors;
}) {
  const chartWidth = SCREEN_WIDTH - 72;
  const chartHeight = 180;
  const barWidth = 24;
  const paddingLeft = 36;
  const paddingRight = 30;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const maxSpend = 320;
  const maxTx = 20;

  // Build line path for transactions
  const points = WEEKLY_DATA.map((d, i) => {
    const x = paddingLeft + (i / (WEEKLY_DATA.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - (d.transactions / maxTx) * plotHeight;
    return { x, y };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
      <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Financial Analytics</Text>
      <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
        Comprehensive view of your spending patterns
      </Text>

      {/* Period Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        {TIME_PERIODS.map((period) => (
          <TouchableOpacity
            key={period}
            onPress={() => onSelectPeriod(period)}
            style={[
              styles.chip,
              { backgroundColor: colors.surfaceContainer },
              selectedPeriod === period && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.onSurfaceVariant },
                selectedPeriod === period && { color: colors.onPrimary },
              ]}
            >
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>This Week</Text>
          <Text style={[styles.statValue, { color: colors.onSurface }]}>$1,188</Text>
          <Text style={styles.statPositive}>↑ 12% vs last week</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Highest Day</Text>
          <Text style={[styles.statValue, { color: colors.onSurface }]}>$310</Text>
          <Text style={[styles.statMuted, { color: colors.onSurfaceVariant }]}>Saturday (18 transactions)</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Total Transactions</Text>
          <Text style={[styles.statValue, { color: colors.onSurface }]}>71</Text>
          <Text style={[styles.statMuted, { color: colors.onSurfaceVariant }]}>10 per day average</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y-axis gridlines */}
          {[0, 80, 160, 240, 320].map((val) => {
            const y =
              paddingTop + plotHeight - (val / maxSpend) * plotHeight;
            return (
              <G key={`grid-${val}`}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke={colors.outlineVariant}
                  strokeWidth={0.5}
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 4}
                  fontSize={9}
                  fill={colors.onSurfaceVariant}
                  textAnchor="end"
                >
                  {val}
                </SvgText>
              </G>
            );
          })}

          {/* Right Y-axis labels (transactions) */}
          {[0, 5, 10, 15, 20].map((val) => {
            const y =
              paddingTop + plotHeight - (val / maxTx) * plotHeight;
            return (
              <SvgText
                key={`rtx-${val}`}
                x={chartWidth - paddingRight + 6}
                y={y + 4}
                fontSize={9}
                fill={colors.onSurfaceVariant}
                textAnchor="start"
              >
                {val}
              </SvgText>
            );
          })}

          {/* Bars */}
          {WEEKLY_DATA.map((d, i) => {
            const x =
              paddingLeft +
              (i / (WEEKLY_DATA.length - 1)) * plotWidth -
              barWidth / 2;
            const barH = (d.spend / maxSpend) * plotHeight;
            const y = paddingTop + plotHeight - barH;
            return (
              <Rect
                key={`bar-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={C.chartBar}
                rx={4}
              />
            );
          })}

          {/* Line for transactions */}
          <Path
            d={linePath}
            stroke={C.chartLine}
            strokeWidth={2}
            fill="none"
          />

          {/* Dots on line */}
          {points.map((p, i) => (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={CHART_COLORS.chartLine}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}

          {/* X-axis labels */}
          {WEEKLY_DATA.map((d, i) => {
            const x =
              paddingLeft + (i / (WEEKLY_DATA.length - 1)) * plotWidth;
            return (
              <SvgText
                key={`xlabel-${i}`}
                x={x}
                y={chartHeight - 4}
                fontSize={10}
                fill={colors.onSurfaceVariant}
                textAnchor="middle"
              >
                {d.day}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

// ─── Monthly Breakdown Card ──────────────────────────────────────────────────

function MonthlyBreakdownCard({ colors }: { colors: ThemeColors }) {
  const size = 140;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Build donut arcs
  let cumulativeAngle = -90; // start at top
  const arcs = CATEGORY_DATA.map((cat) => {
    const angle = (cat.pct / 100) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const endAngle = cumulativeAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { d, color: cat.color };
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
      <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Monthly Spending Breakdown</Text>
      <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
        Distribution across all categories
      </Text>

      <View style={styles.breakdownRow}>
        {/* Donut Chart */}
        <View style={styles.donutContainer}>
          <Svg width={size} height={size}>
            {arcs.map((arc, i) => (
              <Path
                key={i}
                d={arc.d}
                stroke={arc.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="butt"
              />
            ))}
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {CATEGORY_DATA.map((cat) => (
            <View key={cat.name} style={styles.legendRow}>
              <View style={styles.legendLeft}>
                <View
                  style={[styles.legendDot, { backgroundColor: cat.color }]}
                />
                <View>
                  <Text style={[styles.legendName, { color: colors.onSurface }]}>{cat.name}</Text>
                  <Text style={[styles.legendPct, { color: colors.onSurfaceVariant }]}>{cat.pct}%</Text>
                </View>
              </View>
              <Text style={[styles.legendAmount, { color: colors.onSurface }]}>
                ${cat.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── AI Tip Card ─────────────────────────────────────────────────────────────

function AiTipCard({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.tipCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
      <View style={styles.tipAccent} />
      <View style={styles.tipContent}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipIcon}>✦</Text>
          <Text style={[styles.tipTitle, { color: colors.onSurface }]}>AI Tip of the Day</Text>
        </View>
        <Text style={[styles.tipText, { color: colors.onSurfaceVariant }]}>
          Based on your spending patterns, you tend to overspend on weekends.
          Try planning your weekend activities with a budget in mind. You could
          save an estimated $240/month by setting a weekend spending cap of $150.
        </Text>
      </View>
    </View>
  );
}

// ─── Insight Card ────────────────────────────────────────────────────────────

function InsightCard({
  accentColor,
  badgeBg,
  badgeTextColor,
  badgeLabel,
  title,
  description,
  buttonLabel,
  colors,
}: {
  accentColor: string;
  badgeBg: string;
  badgeTextColor: string;
  badgeLabel: string;
  title: string;
  description: string;
  buttonLabel: string;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
      <View style={[styles.insightAccent, { backgroundColor: accentColor }]} />
      <View style={styles.insightContent}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>
            {badgeLabel}
          </Text>
        </View>
        <Text style={[styles.insightTitle, { color: colors.onSurface }]}>{title}</Text>
        <Text style={[styles.insightDesc, { color: colors.onSurfaceVariant }]}>{description}</Text>
        <TouchableOpacity style={[styles.insightButton, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.insightButtonText, { color: colors.onSurface }]}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginTop: 28,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#101814",
    letterSpacing: -0.3,
  },
  sectionSubheading: {
    fontSize: 13,
    color: "#747874",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: C.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    marginTop: 6,
    lineHeight: 21,
  },

  // Empty state
  emptyBanner: {
    backgroundColor: C.tipBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
  },

  // Card base
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.primary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: C.mutedLight,
    marginTop: 3,
    marginBottom: 16,
  },

  // Time period chips
  chipScroll: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  chipContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f0f0ed",
  },
  chipSelected: {
    backgroundColor: C.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.muted,
  },
  chipTextSelected: {
    color: "#ffffff",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8f8f5",
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    color: C.mutedLight,
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: C.primary,
    marginBottom: 3,
  },
  statPositive: {
    fontSize: 10,
    color: C.chartLine,
    fontWeight: "500",
  },
  statMuted: {
    fontSize: 10,
    color: C.mutedLight,
  },

  // Chart
  chartContainer: {
    alignItems: "center",
    marginTop: 4,
  },

  // Monthly breakdown
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  legendContainer: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 12,
    color: C.primary,
    fontWeight: "500",
  },
  legendPct: {
    fontSize: 10,
    color: C.mutedLight,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
  },

  // AI Tip
  tipCard: {
    backgroundColor: C.tipBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    overflow: "hidden",
  },
  tipAccent: {
    width: 4,
    backgroundColor: C.chartBar,
    borderRadius: 2,
    marginRight: 14,
    marginVertical: -20,
    marginLeft: -20,
  },
  tipContent: {
    flex: 1,
    paddingLeft: 14,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 18,
    color: C.chartLine,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.primary,
  },
  tipText: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 19,
  },

  // Insight cards
  insightCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  insightAccent: {
    width: 4,
    borderRadius: 2,
    marginRight: 14,
    marginVertical: -20,
    marginLeft: -20,
  },
  insightContent: {
    flex: 1,
    paddingLeft: 14,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.primary,
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  insightButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0ed",
  },
  insightButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
  },
});
