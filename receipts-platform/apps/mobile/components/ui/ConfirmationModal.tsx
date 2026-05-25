import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryVariant?: 'default' | 'destructive';
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  onDismiss?: () => void;
}

const SPRING_CONFIG = { speed: 16, bounciness: 6, useNativeDriver: true };

const ConfirmationModal = React.memo(function ConfirmationModal({
  visible,
  title,
  message,
  primaryLabel = 'Confirm',
  secondaryLabel = 'Cancel',
  primaryVariant = 'default',
  onPrimaryPress,
  onSecondaryPress,
  onDismiss,
}: ConfirmationModalProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          ...SPRING_CONFIG,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.88);
      cardOpacity.setValue(0);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    onDismiss?.() ?? onSecondaryPress();
  }, [onDismiss, onSecondaryPress]);

  const primaryButtonStyle =
    primaryVariant === 'destructive'
      ? styles.primaryDestructive
      : styles.primaryDefault;

  const primaryTextStyle =
    primaryVariant === 'destructive'
      ? styles.primaryDestructiveText
      : styles.primaryDefaultText;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.wrapper}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDismiss}
            accessibilityLabel="Close modal"
          />
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {/* Secondary */}
            <Pressable
              onPress={onSecondaryPress}
              style={styles.secondaryButton}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </Pressable>

            {/* Primary */}
            <Pressable
              onPress={onPrimaryPress}
              style={[styles.primaryButton, primaryButtonStyle]}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
            >
              <Text style={[styles.primaryText, primaryTextStyle]}>
                {primaryLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(36, 45, 40, 0.4)',
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    shadowColor: '#242D28',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1A',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B6A65',
    marginBottom: 28,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#F7F6F2',
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5D4E',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryDefault: {
    backgroundColor: '#242D28',
  },
  primaryDestructive: {
    backgroundColor: '#D4634B',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryDefaultText: {
    color: '#FFFFFF',
  },
  primaryDestructiveText: {
    color: '#FFFFFF',
  },
});

export { ConfirmationModal };
export type { ConfirmationModalProps };
