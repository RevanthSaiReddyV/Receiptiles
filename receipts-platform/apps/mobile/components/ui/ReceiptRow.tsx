import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MerchantIcon } from './MerchantIcon';

const CATEGORY_COLORS = [
  '#7BE899', '#E8C47B', '#82907A', '#7BA5E8',
  '#E87BB5', '#4A5D4E', '#C4944B', '#6B9E8A',
];

function getCategoryColor(category?: string): string {
  if (!category) return '#82907A';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

interface ReceiptRowProps {
  merchant: string;
  category?: string;
  date: string;
  amount: string;
  cardLast4?: string;
  onPress?: () => void;
  isLast?: boolean;
}

const ReceiptRow = React.memo(function ReceiptRow({
  merchant,
  category,
  date,
  amount,
  cardLast4,
  onPress,
  isLast = false,
}: ReceiptRowProps) {
  const accentColor = getCategoryColor(category);

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        !isLast && styles.borderBottom,
        pressed && styles.pressed,
      ]}
      disabled={!onPress}
    >
      <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      <View style={styles.iconContainer}>
        <MerchantIcon name={merchant} category={category} size={40} />
      </View>
      <View style={styles.center}>
        <Text style={styles.merchantName} numberOfLines={1}>
          {merchant}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {date}
          {cardLast4 ? ` · •••• ${cardLast4}` : ''}
        </Text>
      </View>
      <Text style={styles.amount}>{amount}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEAE4',
  },
  accentLine: {
    width: 2,
    height: 32,
    borderRadius: 1,
    marginRight: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1A',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#6B6A65',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1A',
    marginLeft: 12,
  },
});

export { ReceiptRow };
export type { ReceiptRowProps };
