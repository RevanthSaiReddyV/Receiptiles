import React, { useRef } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  View,
} from 'react-native';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

const Chip = React.memo(function Chip({
  text,
  onPress,
}: {
  text: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.chip}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Text style={styles.chipText}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const SuggestionChips = React.memo(function SuggestionChips({
  suggestions,
  onSelect,
}: SuggestionChipsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {suggestions.map((text, index) => (
          <Chip key={index} text={text} onPress={() => onSelect(text)} />
        ))}
        {/* Spacer to show partial chip hint */}
        <View style={styles.endSpacer} />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#F7F6F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#EBEAE4',
  },
  chipText: {
    fontSize: 14,
    color: '#4A5D4E',
    fontWeight: '500',
  },
  endSpacer: {
    width: 20,
  },
});

export { SuggestionChips };
export type { SuggestionChipsProps };
