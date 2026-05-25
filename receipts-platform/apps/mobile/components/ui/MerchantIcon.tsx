import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Dining: { bg: '#FFF5E0', text: '#E8C47B' },
  Groceries: { bg: '#E8FBF0', text: '#4A5D4E' },
  Gas: { bg: '#EEF1EE', text: '#4A5D4E' },
  Shopping: { bg: '#F3E8FF', text: '#7C3AED' },
  Travel: { bg: '#DBEAFE', text: '#2563EB' },
  Flights: { bg: '#DBEAFE', text: '#2563EB' },
  Hotels: { bg: '#FFF5E0', text: '#B8943F' },
  Transit: { bg: '#E8FBF0', text: '#3AA65B' },
  Entertainment: { bg: '#F3E8FF', text: '#9333EA' },
  Streaming: { bg: '#F3E8FF', text: '#9333EA' },
  Drugstores: { bg: '#FCE7F3', text: '#BE185D' },
  Fitness: { bg: '#E8FBF0', text: '#059669' },
  Utilities: { bg: '#EEF1EE', text: '#6B6A65' },
  Phone: { bg: '#EEF1EE', text: '#6B6A65' },
  Internet: { bg: '#EEF1EE', text: '#82907A' },
  Insurance: { bg: '#FFF5E0', text: '#B8943F' },
  'EV Charging': { bg: '#E8FBF0', text: '#4A5D4E' },
  Food: { bg: '#FFF5E0', text: '#E8C47B' },
  Coffee: { bg: '#FFF5E0', text: '#8B6914' },
  Subscriptions: { bg: '#E8FBF0', text: '#7BE899' },
};

const DEFAULT_COLORS = { bg: '#EEF1EE', text: '#82907A' };

interface MerchantIconProps {
  name: string;
  category?: string;
  size?: number;
}

const MerchantIcon = React.memo(function MerchantIcon({
  name,
  category,
  size = 40,
}: MerchantIconProps) {
  const colors = CATEGORY_COLORS[category ?? ''] ?? DEFAULT_COLORS;

  const initials = name
    .split(/[\s\-&]+/)
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: size * 0.36,
            color: colors.text,
          },
        ]}
      >
        {initials || '?'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});

export { MerchantIcon };
export type { MerchantIconProps };
