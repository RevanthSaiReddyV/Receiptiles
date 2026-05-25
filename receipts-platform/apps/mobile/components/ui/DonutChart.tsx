import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Colors
const CENTER_VALUE_COLOR = '#101814';
const CENTER_LABEL_COLOR = '#747874';

const SegmentArc = React.memo(function SegmentArc({
  segment,
  index,
  radius,
  strokeWidth,
  circumference,
  offset,
  segmentLength,
  isActive,
  onPress,
  centerX,
  centerY,
}: {
  segment: DonutSegment;
  index: number;
  radius: number;
  strokeWidth: number;
  circumference: number;
  offset: number;
  segmentLength: number;
  isActive: boolean;
  onPress: () => void;
  centerX: number;
  centerY: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const activeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 700,
      delay: index * 150,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(activeAnim, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  }, [isActive]);

  // Gap between segments (3px visual gap)
  const gap = 3;
  const gapAngle = (gap / (2 * Math.PI * radius)) * circumference;
  const actualLength = Math.max(0, segmentLength - gapAngle);

  // Animated stroke width: grows from 20 to 24 when active
  const animatedStrokeWidth = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [strokeWidth, strokeWidth + 4],
  });

  // Animated dash offset for clockwise reveal
  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference - actualLength],
  });

  // Rotation to position this segment
  const rotation = -90 + (offset / circumference) * 360;

  return (
    <AnimatedCircle
      cx={centerX}
      cy={centerY}
      r={radius}
      stroke={segment.color}
      strokeWidth={animatedStrokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={`${actualLength} ${circumference - actualLength}`}
      strokeDashoffset={dashOffset}
      rotation={rotation}
      origin={`${centerX}, ${centerY}`}
      opacity={isActive ? 1 : 0.85}
      onPress={onPress}
    />
  );
});

const DonutChart = React.memo(function DonutChart({
  segments,
  size = 180,
  strokeWidth = 20,
  centerLabel,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const centerAnim = useRef(new Animated.Value(1)).current;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let cumulativeOffset = 0;
  const segmentData = segments.map((segment) => {
    const segmentLength = (segment.value / total) * circumference;
    const currentOffset = cumulativeOffset;
    cumulativeOffset += segmentLength;
    return { segment, offset: currentOffset, segmentLength };
  });

  useEffect(() => {
    // Subtle pulse on center when active segment changes
    centerAnim.setValue(0.95);
    Animated.spring(centerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [activeIndex]);

  const displayLabel =
    activeIndex !== null
      ? segments[activeIndex].label
      : centerLabel || 'Total';

  const displayValue =
    activeIndex !== null
      ? `$${segments[activeIndex].value.toLocaleString()}`
      : `$${total.toLocaleString()}`;

  const activeColor =
    activeIndex !== null ? segments[activeIndex].color : undefined;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => setActiveIndex(null)}
      style={[styles.container, { width: size, height: size }]}
    >
      <Svg width={size} height={size}>
        <G>
          {segmentData.map(({ segment, offset, segmentLength }, index) => (
            <SegmentArc
              key={index}
              segment={segment}
              index={index}
              radius={radius}
              strokeWidth={strokeWidth}
              circumference={circumference}
              offset={offset}
              segmentLength={segmentLength}
              isActive={activeIndex === index}
              centerX={centerX}
              centerY={centerY}
              onPress={() =>
                setActiveIndex(activeIndex === index ? null : index)
              }
            />
          ))}
        </G>
      </Svg>

      {/* Center content */}
      <Animated.View
        style={[
          styles.center,
          {
            transform: [{ scale: centerAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.centerValue,
            activeColor ? { color: activeColor } : {},
          ]}
        >
          {displayValue}
        </Text>
        <Text style={styles.centerLabel}>{displayLabel}</Text>
      </Animated.View>

      {/* Active segment glow indicator */}
      {activeIndex !== null && (
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: segments[activeIndex].color },
          ]}
        />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: CENTER_VALUE_COLOR,
    letterSpacing: -0.5,
  },
  centerLabel: {
    fontSize: 11,
    color: CENTER_LABEL_COLOR,
    marginTop: 3,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

export { DonutChart };
export type { DonutChartProps, DonutSegment };
