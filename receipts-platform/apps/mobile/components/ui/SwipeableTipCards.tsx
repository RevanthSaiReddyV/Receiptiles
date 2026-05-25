import React, { memo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Tip {
  id: string;
  emoji: string;
  title: string;
  body: string;
  accentColor: string;
  category: string;
}

interface SwipeableTipCardsProps {
  tips: Tip[];
  onSwipeLeft?: (tip: Tip) => void;
  onSwipeRight?: (tip: Tip) => void;
}

export const SwipeableTipCards = memo(function SwipeableTipCards({
  tips,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableTipCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-8deg", "0deg", "8deg"],
  });
  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.92, 1],
    extrapolate: "clamp",
  });
  const nextCardOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.6, 1],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeCard("right");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeCard("left");
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const swipeCard = useCallback(
    (direction: "left" | "right") => {
      const x = direction === "right" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
      Animated.timing(position, {
        toValue: { x, y: 0 },
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        const tip = tips[currentIndex];
        if (direction === "right") onSwipeRight?.(tip);
        else onSwipeLeft?.(tip);
        position.setValue({ x: 0, y: 0 });
        setCurrentIndex((prev) => prev + 1);
      });
    },
    [currentIndex, tips]
  );

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, []);

  if (currentIndex >= tips.length) {
    return (
      <View style={s.completedContainer}>
        <Text style={s.completedEmoji}>✨</Text>
        <Text style={s.completedTitle}>All caught up!</Text>
        <Text style={s.completedSubtitle}>Check back tomorrow for new insights.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Counter */}
      <View style={s.counter}>
        <Text style={s.counterText}>
          {currentIndex + 1} of {tips.length}
        </Text>
        <View style={s.dots}>
          {tips.map((_, i) => (
            <View key={i} style={[s.dot, i <= currentIndex && s.dotActive]} />
          ))}
        </View>
      </View>

      {/* Card stack */}
      <View style={s.cardStack}>
        {/* Next card (behind) */}
        {currentIndex + 1 < tips.length && (
          <Animated.View
            style={[
              s.card,
              s.nextCard,
              {
                transform: [{ scale: nextCardScale }],
                opacity: nextCardOpacity,
                backgroundColor: "#ffffff",
              },
            ]}
          >
            <Text style={s.cardEmoji}>{tips[currentIndex + 1].emoji}</Text>
          </Animated.View>
        )}

        {/* Current card (top) */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            s.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
        >
          <View style={[s.categoryBadge, { backgroundColor: tips[currentIndex].accentColor + "20" }]}>
            <Text style={[s.categoryText, { color: tips[currentIndex].accentColor }]}>
              {tips[currentIndex].category}
            </Text>
          </View>
          <Text style={s.cardEmoji}>{tips[currentIndex].emoji}</Text>
          <Text style={s.cardTitle}>{tips[currentIndex].title}</Text>
          <Text style={s.cardBody}>{tips[currentIndex].body}</Text>
        </Animated.View>
      </View>

      {/* Swipe hints */}
      <View style={s.hints}>
        <TouchableOpacity onPress={() => swipeCard("left")} style={s.hintBtn}>
          <Ionicons name="close" size={20} color="#747874" />
          <Text style={s.hintText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => swipeCard("right")} style={[s.hintBtn, s.hintBtnActive]}>
          <Ionicons name="bookmark" size={20} color="#006d36" />
          <Text style={[s.hintText, { color: "#006d36" }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Default daily tips data
export const DAILY_TIPS: Tip[] = [
  {
    id: "1",
    emoji: "💡",
    title: "The 50/30/20 Rule",
    body: "Allocate 50% of income to needs, 30% to wants, and 20% to savings. Based on your spending, you're at 55/35/10 — try shifting $200 from dining to savings.",
    accentColor: "#006d36",
    category: "Budgeting",
  },
  {
    id: "2",
    emoji: "🔄",
    title: "Annual vs Monthly Subscriptions",
    body: "You're paying $47/mo for services that offer annual plans. Switching Netflix, Spotify, and iCloud to yearly billing saves $84/year.",
    accentColor: "#ba1a1a",
    category: "Savings",
  },
  {
    id: "3",
    emoji: "💳",
    title: "Maximize Dining Rewards",
    body: "You spent $850 on dining this month. Using your Amex Gold (4x) instead of your Visa (1x) would earn an extra $25.50 in points.",
    accentColor: "#e6c279",
    category: "Rewards",
  },
  {
    id: "4",
    emoji: "📊",
    title: "Weekend Spending Pattern",
    body: "You spend 45% more on weekends ($310 avg) vs weekdays ($180 avg). Setting a $250 weekend budget could save $240/month.",
    accentColor: "#006d36",
    category: "Insights",
  },
  {
    id: "5",
    emoji: "🎯",
    title: "Emergency Fund Check",
    body: "Financial advisors recommend 3-6 months expenses ($8,400-$16,800 for you). You're at 65% — at your savings rate, you'll hit it in 4 months.",
    accentColor: "#89f6a6",
    category: "Goals",
  },
];

const s = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  counter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  counterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#747874",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e3e2df",
  },
  dotActive: {
    backgroundColor: "#6fdc8f",
    width: 14,
  },
  cardStack: {
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 56,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#c3c8c3",
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  nextCard: {
    top: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardEmoji: {
    fontSize: 44,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#101814",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#434845",
    textAlign: "center",
  },
  hints: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    marginTop: 16,
  },
  hintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#f5f4f0",
  },
  hintBtnActive: {
    backgroundColor: "#89f6a620",
  },
  hintText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#747874",
  },
  completedContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  completedEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#101814",
  },
  completedSubtitle: {
    fontSize: 14,
    color: "#747874",
    marginTop: 4,
  },
});
