import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type AlertVariant = 'warning' | 'urgent' | 'info' | 'success';

const VARIANT_CONFIG: Record<AlertVariant, { accent: string; bg: string; icon: string }> = {
  warning: { accent: '#E8C47B', bg: 'rgba(232, 196, 123, 0.08)', icon: '⚠️' },
  urgent: { accent: '#E87B7B', bg: 'rgba(232, 123, 123, 0.08)', icon: '‼️' },
  info: { accent: '#82907A', bg: 'rgba(130, 144, 122, 0.06)', icon: 'ℹ️' },
  success: { accent: '#7BE899', bg: 'rgba(123, 232, 153, 0.08)', icon: '✅' },
};

interface AlertBannerProps {
  title: string;
  message?: string;
  variant?: AlertVariant;
  onDismiss?: () => void;
}

const AlertBanner = React.memo(function AlertBanner({
  title,
  message,
  variant = 'info',
  onDismiss,
}: AlertBannerProps) {
  const config = VARIANT_CONFIG[variant];

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={[styles.accentBar, { backgroundColor: config.accent }]} />
      <Text style={styles.icon}>{config.icon}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      {onDismiss ? (
        <Pressable
          onPress={handleDismiss}
          style={styles.dismissButton}
          hitSlop={8}
        >
          <Text style={styles.dismissText}>{'✕'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  icon: {
    fontSize: 16,
    marginLeft: 12,
    marginRight: 10,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  message: {
    fontSize: 13,
    color: '#6B6A65',
    marginTop: 2,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 10,
    padding: 2,
  },
  dismissText: {
    fontSize: 14,
    color: '#A0AFAA',
    fontWeight: '600',
  },
});

export { AlertBanner };
export type { AlertBannerProps, AlertVariant };
