import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

const EmptyState = React.memo(function EmptyState({
  emoji,
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {ctaLabel && onCtaPress ? (
        <Pressable
          onPress={onCtaPress}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6A65',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#242D28',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export { EmptyState };
export type { EmptyStateProps };
