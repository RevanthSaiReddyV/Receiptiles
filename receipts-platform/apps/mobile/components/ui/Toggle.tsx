import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const TRACK_RADIUS = TRACK_HEIGHT / 2;
const THUMB_OFFSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2;

const Toggle = React.memo(function Toggle({
  value,
  onValueChange,
  label,
  sublabel,
  disabled = false,
  containerStyle,
}: ToggleProps) {
  const translateX = useRef(new Animated.Value(value ? THUMB_TRAVEL : 0)).current;
  const trackColor = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? THUMB_TRAVEL : 0,
        friction: 7,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.timing(trackColor, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, translateX, trackColor]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  }, [value, onValueChange, disabled]);

  const interpolatedTrackColor = trackColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EBEAE4', '#7BE899'],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled, containerStyle]}
    >
      {(label || sublabel) && (
        <View style={styles.labelContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
        </View>
      )}

      <Animated.View
        style={[
          styles.track,
          { backgroundColor: interpolatedTrackColor as any },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  disabled: {
    opacity: 0.45,
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1A',
    letterSpacing: 0.1,
  },
  sublabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B6A65',
    marginTop: 2,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    justifyContent: 'center',
    paddingHorizontal: THUMB_OFFSET,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#242D28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

export { Toggle };
export type { ToggleProps };
