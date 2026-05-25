import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarDataPoint[];
  orientation?: 'horizontal' | 'vertical';
  height?: number;
}

// Colors
const PRIMARY_BAR = '#6fdc8f';
const SECONDARY_BAR = '#e3e2df';
const LABEL_COLOR = '#747874';
const VALUE_COLOR = '#101814';
const GRID_COLOR = '#e3e2df';
const GLOW_COLOR = '#6fdc8f';

const VerticalBar = React.memo(function VerticalBar({
  item,
  index,
  maxValue,
  barWidth,
  chartHeight,
  isMax,
  showValue,
}: {
  item: BarDataPoint;
  index: number;
  maxValue: number;
  barWidth: number;
  chartHeight: number;
  isMax: boolean;
  showValue: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();
  }, []);

  const barHeight = (item.value / maxValue) * chartHeight;
  const color = item.color || (isMax ? PRIMARY_BAR : SECONDARY_BAR);

  const animatedHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, barHeight],
  });

  const actualWidth = isMax ? barWidth + 4 : barWidth;

  return (
    <View style={styles.verticalColumn}>
      {/* Value label on top - only shown on tallest bar */}
      {showValue && (
        <Animated.Text
          style={[
            styles.valueLabel,
            { opacity: anim },
          ]}
        >
          ${item.value.toLocaleString()}
        </Animated.Text>
      )}
      <View style={[styles.verticalBarContainer, { height: chartHeight }]}>
        <Animated.View
          style={[
            styles.verticalBar,
            {
              height: animatedHeight,
              width: actualWidth,
              backgroundColor: color,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              ...(isMax
                ? Platform.select({
                    ios: {
                      shadowColor: GLOW_COLOR,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 4,
                    },
                  })
                : {}),
            },
          ]}
        />
      </View>
      <Text style={styles.verticalLabel} numberOfLines={1}>
        {item.label}
      </Text>
    </View>
  );
});

const HorizontalBar = React.memo(function HorizontalBar({
  item,
  index,
  maxValue,
  isMax,
}: {
  item: BarDataPoint;
  index: number;
  maxValue: number;
  isMax: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();
  }, []);

  const percentage = (item.value / maxValue) * 100;
  const color = item.color || (isMax ? PRIMARY_BAR : SECONDARY_BAR);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${percentage}%`],
  });

  return (
    <View style={styles.horizontalRow}>
      <Text style={styles.horizontalLabel} numberOfLines={1}>
        {item.label}
      </Text>
      <View style={styles.horizontalTrack}>
        <Animated.View
          style={[
            styles.horizontalBar,
            {
              width,
              backgroundColor: color,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
              ...(isMax
                ? Platform.select({
                    ios: {
                      shadowColor: GLOW_COLOR,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    },
                    android: {
                      elevation: 3,
                    },
                  })
                : {}),
            },
          ]}
        />
      </View>
      <Text style={[styles.horizontalValue, isMax && styles.horizontalValueActive]}>
        ${item.value.toLocaleString()}
      </Text>
    </View>
  );
});

const MiniBarChart = React.memo(function MiniBarChart({
  data,
  orientation = 'vertical',
  height = 160,
}: MiniBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const maxIndex = data.findIndex((d) => d.value === maxValue);

  if (orientation === 'horizontal') {
    return (
      <View style={[styles.container, { minHeight: data.length * 40 }]}>
        {data.map((item, index) => (
          <HorizontalBar
            key={index}
            item={item}
            index={index}
            maxValue={maxValue}
            isMax={index === maxIndex}
          />
        ))}
      </View>
    );
  }

  const chartHeight = height - 44; // room for value label + bottom label
  const barWidth = Math.min(28, (100 / data.length) * 0.55);

  return (
    <View style={[styles.container, { height }]}>
      {/* Soft grid line at 50% mark */}
      <View
        style={[
          styles.gridLine,
          { top: 16 + chartHeight * 0.5 },
        ]}
      />
      <View style={styles.verticalBars}>
        {data.map((item, index) => (
          <VerticalBar
            key={index}
            item={item}
            index={index}
            maxValue={maxValue}
            barWidth={barWidth}
            chartHeight={chartHeight}
            isMax={index === maxIndex}
            showValue={index === maxIndex}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 4,
  },
  // Grid
  gridLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: GRID_COLOR,
    opacity: 0.6,
  },
  // Vertical styles
  verticalBars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 16,
  },
  verticalColumn: {
    alignItems: 'center',
    flex: 1,
  },
  verticalBarContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  verticalBar: {
    maxWidth: 32,
  },
  verticalLabel: {
    fontSize: 11,
    color: LABEL_COLOR,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: VALUE_COLOR,
    marginBottom: 4,
    textAlign: 'center',
  },
  // Horizontal styles
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalLabel: {
    fontSize: 12,
    color: VALUE_COLOR,
    width: 72,
    fontWeight: '500',
  },
  horizontalTrack: {
    flex: 1,
    height: 22,
    backgroundColor: '#f5f5f3',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  horizontalBar: {
    height: '100%',
    borderRadius: 4,
  },
  horizontalValue: {
    fontSize: 12,
    color: LABEL_COLOR,
    width: 60,
    textAlign: 'right',
    fontWeight: '600',
  },
  horizontalValueActive: {
    color: VALUE_COLOR,
    fontWeight: '700',
  },
});

export { MiniBarChart };
export type { MiniBarChartProps, BarDataPoint };
