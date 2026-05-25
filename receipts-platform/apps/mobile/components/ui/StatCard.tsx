import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StatVariant = 'positive' | 'negative' | 'neutral';

const VARIANT_COLORS: Record<StatVariant, string> = {
  positive: '#7BE899',
  negative: '#E87B7B',
  neutral: '#1C1C1A',
};

const VARIANT_BG: Record<StatVariant, string> = {
  positive: 'rgba(123, 232, 153, 0.03)',
  negative: 'rgba(232, 123, 123, 0.03)',
  neutral: 'rgba(36, 45, 40, 0.02)',
};

interface StatCardProps {
  value: string;
  label: string;
  variant?: StatVariant;
  trendDirection?: 'up' | 'down';
  trendValue?: string;
}

const StatCard = React.memo(function StatCard({
  value,
  label,
  variant = 'neutral',
  trendDirection,
  trendValue,
}: StatCardProps) {
  const numberColor = VARIANT_COLORS[variant];

  return (
    <View style={[styles.container, { backgroundColor: VARIANT_BG[variant] }]}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: numberColor }]}>{value}</Text>
        {trendDirection && trendValue ? (
          <View style={styles.trendContainer}>
            <Text style={[styles.trendArrow, { color: trendDirection === 'up' ? '#7BE899' : '#E87B7B' }]}>
              {trendDirection === 'up' ? '↑' : '↓'}
            </Text>
            <Text style={[styles.trendValue, { color: trendDirection === 'up' ? '#7BE899' : '#E87B7B' }]}>
              {trendValue}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBEAE4',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  trendArrow: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  label: {
    fontSize: 12,
    color: '#6B6A65',
    marginTop: 4,
    fontWeight: '500',
  },
});

export { StatCard };
export type { StatCardProps, StatVariant };
