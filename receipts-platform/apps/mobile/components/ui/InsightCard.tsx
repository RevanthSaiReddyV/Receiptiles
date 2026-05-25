import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InsightCardProps {
  icon?: string; // emoji string
  ionicon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  headline: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

const InsightCard = React.memo(function InsightCard({
  icon,
  ionicon,
  iconColor = '#7BE899',
  headline,
  body,
  actionLabel,
  onAction,
}: InsightCardProps) {
  // Create a very light tint of the icon color for background
  const tintBg = iconColor + '18'; // ~9% opacity via hex alpha

  return (
    <View style={[styles.container, { backgroundColor: tintBg }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '30' }]}>
          {icon ? (
            <Text style={styles.emoji}>{icon}</Text>
          ) : ionicon ? (
            <Ionicons name={ionicon} size={18} color={iconColor} />
          ) : null}
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>
      </View>
      <Text style={styles.body} numberOfLines={3}>
        {body}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color="#7BE899" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emoji: {
    fontSize: 16,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1A',
    flex: 1,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B6A65',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7BE899',
    marginRight: 4,
  },
});

export { InsightCard };
export type { InsightCardProps };
