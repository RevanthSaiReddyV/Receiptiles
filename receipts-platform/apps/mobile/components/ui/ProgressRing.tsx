import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}

const ProgressRing = React.memo(function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#7BE899',
  trackColor = '#EBEAE4',
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  // Color shifts: mint → gold → red as progress goes 0 → 0.8 → 1+
  const dynamicColor =
    progress > 1 ? '#E05252' : progress > 0.8 ? '#E8C47B' : color;

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={dynamicColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        {label && (
          <Text style={[styles.label, { fontSize: size * 0.18 }]}>
            {label}
          </Text>
        )}
        {sublabel && (
          <Text style={[styles.sublabel, { fontSize: size * 0.1 }]}>
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    color: '#1C1C1A',
  },
  sublabel: {
    color: '#6B6A65',
    marginTop: 2,
  },
});

export { ProgressRing };
export type { ProgressRingProps };
