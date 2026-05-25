import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';

type IconButtonVariant = 'filled' | 'ghost' | 'tinted';
type IconButtonSize = 36 | 44 | 52;

interface IconButtonProps {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  tintColor?: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}

const SPRING_CONFIG = { useNativeDriver: true, speed: 60, bounciness: 6 };

let triggerHaptic: (() => void) | undefined;
try {
  // Attempt to use expo-haptics if available
  const Haptics = require('expo-haptics');
  triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
} catch {
  triggerHaptic = undefined;
}

const IconButton = React.memo(function IconButton({
  icon,
  variant = 'ghost',
  size = 44,
  tintColor = '#7BE899',
  disabled = false,
  onPress,
  accessibilityLabel,
}: IconButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      ...SPRING_CONFIG,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...SPRING_CONFIG,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (triggerHaptic && Platform.OS === 'ios') {
      triggerHaptic();
    }
    onPress?.();
  }, [onPress]);

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    variant === 'filled' && styles.filled,
    variant === 'ghost' && styles.ghost,
    variant === 'tinted' && { backgroundColor: tintColor + '1A' }, // 10% opacity
    disabled && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: '#242D28',
    shadowColor: '#242D28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
});

export { IconButton };
export type { IconButtonProps, IconButtonVariant, IconButtonSize };
