import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
} from 'react-native-svg';

interface DataPoint {
  label: string;
  value: number;
}

interface SpendingChartProps {
  data: DataPoint[];
  height?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Colors
const LINE_COLOR = '#006d36';
const GRADIENT_COLOR = '#6fdc8f';
const GRID_COLOR = '#e3e2df';
const LABEL_COLOR = '#747874';
const LABEL_ACTIVE_COLOR = '#006d36';
const TOOLTIP_BG = '#ffffff';
const TOOLTIP_TEXT = '#101814';
const DOT_GLOW_COLOR = '#6fdc8f';

function buildBezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const tension = 0.4;
    const cpx1 = current.x + (next.x - current.x) * tension;
    const cpy1 = current.y;
    const cpx2 = next.x - (next.x - current.x) * tension;
    const cpy2 = next.y;
    path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildFillPath(
  points: { x: number; y: number }[],
  chartHeight: number
): string {
  if (points.length < 2) return '';

  const linePath = buildBezierPath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return `${linePath} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`;
}

const SpendingChart = React.memo(function SpendingChart({
  data,
  height = 200,
}: SpendingChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [touchIndex, setTouchIndex] = useState<number | null>(null);
  const strokeAnim = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const pathLength = useRef(1200);

  const padding = { top: 24, bottom: 36, left: 12, right: 12 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = containerWidth - padding.left - padding.right;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (chartWidth / Math.max(data.length - 1, 1)) * i,
    y: padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight,
  }));

  // Grid lines at 25%, 50%, 75%
  const gridLines = [0.25, 0.5, 0.75].map(
    (pct) => padding.top + chartHeight * (1 - pct)
  );

  useEffect(() => {
    strokeAnim.setValue(0);
    Animated.timing(strokeAnim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: true,
    }).start();
  }, [data]);

  const showTooltip = useCallback(() => {
    Animated.parallel([
      Animated.spring(dotOpacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hideTooltip = useCallback(() => {
    Animated.parallel([
      Animated.timing(dotOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        updateTouch(gestureState.x0);
        showTooltip();
      },
      onPanResponderMove: (_, gestureState) => {
        updateTouch(gestureState.moveX);
      },
      onPanResponderRelease: () => {
        setTouchIndex(null);
        hideTooltip();
      },
      onPanResponderTerminate: () => {
        setTouchIndex(null);
        hideTooltip();
      },
    })
  ).current;

  function updateTouch(x: number) {
    if (data.length === 0 || chartWidth <= 0) return;
    const step = chartWidth / Math.max(data.length - 1, 1);
    const relX = x - padding.left;
    const idx = Math.round(relX / step);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setTouchIndex(clamped);
  }

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const strokeDashoffset = strokeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [pathLength.current, 0],
  });

  const linePath = buildBezierPath(points);
  const fillPath = buildFillPath(points, padding.top + chartHeight);

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      {containerWidth > 0 && (
        <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill}>
          <Svg width={containerWidth} height={height - padding.bottom + 4}>
            <Defs>
              <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={GRADIENT_COLOR} stopOpacity="0.25" />
                <Stop offset="0.7" stopColor={GRADIENT_COLOR} stopOpacity="0.06" />
                <Stop offset="1" stopColor={GRADIENT_COLOR} stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="dotGlow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={DOT_GLOW_COLOR} stopOpacity="0.5" />
                <Stop offset="1" stopColor={DOT_GLOW_COLOR} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Soft horizontal grid lines */}
            {gridLines.map((y, i) => (
              <Line
                key={`grid-${i}`}
                x1={padding.left}
                y1={y}
                x2={containerWidth - padding.right}
                y2={y}
                stroke={GRID_COLOR}
                strokeWidth={0.8}
                strokeDasharray="4,6"
                opacity={0.5}
              />
            ))}

            {/* Gradient area fill */}
            <Path d={fillPath} fill="url(#areaGrad)" />

            {/* Main bezier line */}
            <AnimatedPath
              d={linePath}
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLength.current}
              strokeDashoffset={strokeDashoffset}
            />

            {/* Active point glow + dot (only on touch) */}
            {touchIndex !== null && points[touchIndex] && (
              <>
                {/* Glow ring */}
                <Circle
                  cx={points[touchIndex].x}
                  cy={points[touchIndex].y}
                  r={12}
                  fill={DOT_GLOW_COLOR}
                  opacity={0.15}
                />
                {/* Active dot */}
                <Circle
                  cx={points[touchIndex].x}
                  cy={points[touchIndex].y}
                  r={6}
                  fill={LINE_COLOR}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
                {/* Vertical guide */}
                <Line
                  x1={points[touchIndex].x}
                  y1={padding.top}
                  x2={points[touchIndex].x}
                  y2={padding.top + chartHeight}
                  stroke={LINE_COLOR}
                  strokeWidth={0.8}
                  strokeDasharray="3,4"
                  opacity={0.3}
                />
              </>
            )}
          </Svg>

          {/* Floating tooltip card */}
          {touchIndex !== null && data[touchIndex] && (
            <Animated.View
              style={[
                styles.tooltip,
                {
                  opacity: tooltipOpacity,
                  left: Math.max(
                    8,
                    Math.min(
                      containerWidth - 100,
                      points[touchIndex].x - 48
                    )
                  ),
                  top: Math.max(0, points[touchIndex].y - 52),
                },
              ]}
            >
              <Text style={styles.tooltipValue}>
                ${data[touchIndex].value.toLocaleString()}
              </Text>
              <Text style={styles.tooltipLabel}>
                {data[touchIndex].label}
              </Text>
            </Animated.View>
          )}

          {/* X-axis labels */}
          <View style={styles.labels}>
            {data.map((d, i) => (
              <Text
                key={i}
                style={[
                  styles.label,
                  touchIndex === i && styles.labelActive,
                ]}
              >
                {d.label}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    color: LABEL_COLOR,
    fontWeight: '500',
  },
  labelActive: {
    color: LABEL_ACTIVE_COLOR,
    fontWeight: '700',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: TOOLTIP_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tooltipValue: {
    color: TOOLTIP_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipLabel: {
    color: LABEL_COLOR,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export { SpendingChart };
export type { SpendingChartProps, DataPoint };
