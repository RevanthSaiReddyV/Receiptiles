import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  Animated,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onPress?: () => void;
}

const SCALE_PRESSED = 0.97;
const SPRING_CONFIG = { useNativeDriver: true, speed: 50, bounciness: 4 };

const Button = React.memo(function Button({
  title,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  onPress,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: SCALE_PRESSED,
      ...SPRING_CONFIG,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...SPRING_CONFIG,
    }).start();
  }, [scaleAnim]);

  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    sizeStyles[size],
    variantContainerStyles[variant],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.label,
    sizeTextStyles[size],
    variantTextStyles[variant],
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' ? '#242D28' : variantSpinnerColor[variant]}
          />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconSlot}>{icon}</View>}
            <Text style={textStyle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const variantSpinnerColor: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#242D28',
  accent: '#242D28',
  destructive: '#FFFFFF',
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#242D28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    marginRight: 8,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    minHeight: 36,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 54,
  },
});

const sizeTextStyles = StyleSheet.create({
  sm: {
    fontSize: 14,
    lineHeight: 18,
  },
  md: {
    fontSize: 16,
    lineHeight: 20,
  },
  lg: {
    fontSize: 18,
    lineHeight: 22,
  },
});

const variantContainerStyles = StyleSheet.create({
  primary: {
    backgroundColor: '#242D28',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4A5D4E',
    shadowOpacity: 0,
    elevation: 0,
  },
  accent: {
    backgroundColor: '#7BE899',
    shadowColor: '#7BE899',
    shadowOpacity: 0.2,
  },
  destructive: {
    backgroundColor: '#D4634B',
    shadowColor: '#D4634B',
    shadowOpacity: 0.15,
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    color: '#FFFFFF',
  },
  secondary: {
    color: '#4A5D4E',
  },
  accent: {
    color: '#1C1C1A',
  },
  destructive: {
    color: '#FFFFFF',
  },
});

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
