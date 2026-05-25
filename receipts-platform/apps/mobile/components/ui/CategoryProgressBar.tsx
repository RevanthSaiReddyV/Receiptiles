import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface CategoryProgressBarProps {
  category: string;
  emoji: string;
  spent: number;
  limit: number;
  color?: string;
}

function getBarColor(ratio: number, overrideColor?: string): string {
  if (overrideColor) return overrideColor;
  if (ratio > 1) return '#E87B7B'; // terracotta — over budget
  if (ratio >= 0.7) return '#E8C47B'; // gold — warning
  return '#7BE899'; // mint — healthy
}

const CategoryProgressBar = React.memo(function CategoryProgressBar({
  category,
  emoji,
  spent,
  limit,
  color,
}: CategoryProgressBarProps) {
  const ratio = limit > 0 ? spent / limit : 0;
  const clampedRatio = Math.min(ratio, 1);
  const barColor = getBarColor(ratio, color);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedRatio,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clampedRatio, animatedWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.categoryName}>{category}</Text>
        </View>
        <Text style={styles.amounts}>
          <Text style={styles.spent}>${spent.toLocaleString()}</Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.limit}>${limit.toLocaleString()}</Text>
        </Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1A',
  },
  amounts: {
    fontSize: 13,
  },
  spent: {
    fontWeight: '700',
    color: '#1C1C1A',
  },
  separator: {
    color: '#A0AFAA',
  },
  limit: {
    fontWeight: '500',
    color: '#6B6A65',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EBEAE4',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});

export { CategoryProgressBar };
export type { CategoryProgressBarProps };
