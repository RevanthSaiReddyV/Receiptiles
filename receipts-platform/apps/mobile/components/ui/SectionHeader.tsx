import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader = React.memo(function SectionHeader({
  title,
  actionLabel = 'See all',
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1A',
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7BE899',
  },
});

export { SectionHeader };
export type { SectionHeaderProps };
