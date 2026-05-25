import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Pressable,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

const FilterChip = React.memo(function FilterChip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
}: FilterChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.chip,
          selected ? styles.chipSelected : styles.chipUnselected,
          disabled && styles.chipDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={selected ? '#FFFFFF' : '#4A5D4E'}
            style={styles.chipIcon}
          />
        )}
        <Text
          style={[
            styles.chipLabel,
            selected ? styles.chipLabelSelected : styles.chipLabelUnselected,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

interface FilterChipGroupProps {
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

const FilterChipGroup = React.memo(function FilterChipGroup({
  children,
  containerStyle,
}: FilterChipGroupProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.groupContainer, containerStyle]}
    >
      {children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#4A5D4E',
  },
  chipUnselected: {
    backgroundColor: '#F7F6F2',
    borderWidth: 1,
    borderColor: '#EBEAE4',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  chipLabelUnselected: {
    color: '#4A5D4E',
  },
  groupContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});

export { FilterChip, FilterChipGroup };
export type { FilterChipProps, FilterChipGroupProps };
