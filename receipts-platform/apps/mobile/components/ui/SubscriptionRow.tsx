import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type SubscriptionStatus = 'active' | 'expiring' | 'cancelled';

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: '#7BE899',
  expiring: '#E8C47B',
  cancelled: '#E87B7B',
};

interface SubscriptionRowProps {
  merchant: string;
  amount: string;
  frequency: string;
  status: SubscriptionStatus;
  category?: string;
  renewsInDays?: number;
  onPress?: () => void;
  onLongPress?: () => void;
}

const SubscriptionRow = React.memo(function SubscriptionRow({
  merchant,
  amount,
  frequency,
  status,
  category,
  renewsInDays,
  onPress,
  onLongPress,
}: SubscriptionRowProps) {
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress?.();
  }, [onLongPress]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      disabled={!onPress && !onLongPress}
    >
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: STATUS_COLORS[status] },
            ]}
          />
          <Text style={styles.merchantName} numberOfLines={1}>
            {merchant}
          </Text>
          {category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.amount}>{amount}</Text>
          <Text style={styles.frequency}>/{frequency}</Text>
        </View>
      </View>
      {renewsInDays != null && status !== 'cancelled' ? (
        <Text style={styles.renewsText}>
          Renews in {renewsInDays} day{renewsInDays !== 1 ? 's' : ''}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEAE4',
  },
  pressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1A',
    marginRight: 8,
    flexShrink: 1,
  },
  categoryPill: {
    backgroundColor: '#F7F6F2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#82907A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  frequency: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B6A65',
    marginLeft: 1,
  },
  renewsText: {
    fontSize: 12,
    color: '#A0AFAA',
    marginTop: 4,
    marginLeft: 18,
  },
});

export { SubscriptionRow };
export type { SubscriptionRowProps, SubscriptionStatus };
