import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type BadgeVariant = 'connected' | 'pending' | 'coming-soon' | 'error';

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  connected: { bg: '#E0FBE9', text: '#242D28' },
  pending: { bg: '#FFF5E0', text: '#242D28' },
  'coming-soon': { bg: '#F7F6F2', text: '#6B6A65' },
  error: { bg: '#FDE8E8', text: '#242D28' },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const Badge = React.memo(function Badge({
  label,
  variant = 'connected',
}: BadgeProps) {
  const colors = VARIANT_STYLES[variant];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export { Badge };
export type { BadgeProps, BadgeVariant };
