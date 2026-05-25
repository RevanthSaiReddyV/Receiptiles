import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  Animated,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { FilterChip, FilterChipGroup } from './FilterChip';

interface CurrencyInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  presets?: number[];
  showPresets?: boolean;
  label?: string;
  containerStyle?: ViewStyle;
}

function formatCurrency(raw: string): string {
  // Remove all non-digit characters except decimal
  const cleaned = raw.replace(/[^0-9.]/g, '');

  // Split on decimal point
  const parts = cleaned.split('.');
  const intPart = parts[0] || '';
  const decPart = parts.length > 1 ? parts[1].slice(0, 2) : undefined;

  // Add commas to integer part
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (decPart !== undefined) {
    return `${withCommas}.${decPart}`;
  }
  return withCommas;
}

function rawFromFormatted(formatted: string): string {
  return formatted.replace(/,/g, '');
}

const CurrencyInput = React.memo(function CurrencyInput({
  value,
  onChangeText,
  placeholder = '0',
  presets = [50, 100, 200, 500],
  showPresets = true,
  label,
  containerStyle,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const displayValue = formatCurrency(value);

  const handleChangeText = useCallback(
    (text: string) => {
      // Only allow digits and one decimal point
      const raw = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = raw.split('.');
      const sanitized =
        parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
      onChangeText(sanitized);
    },
    [onChangeText]
  );

  const handlePresetPress = useCallback(
    (amount: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChangeText(amount.toString());
      // Pulse animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 150,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [onChangeText, scaleAnim]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.inputContainer}
      >
        <Animated.View
          style={[styles.amountRow, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            ref={inputRef}
            style={styles.amountInput}
            value={displayValue}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor="#EBEAE4"
            keyboardType="decimal-pad"
            selectionColor="#7BE899"
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </Animated.View>

        <View
          style={[
            styles.underline,
            isFocused ? styles.underlineFocused : styles.underlineDefault,
          ]}
        />
      </Pressable>

      {showPresets && (
        <View style={styles.presetsContainer}>
          <FilterChipGroup containerStyle={styles.presetsGroup}>
            {presets.map((amount) => (
              <FilterChip
                key={amount}
                label={`$${amount}`}
                selected={rawFromFormatted(value) === amount.toString()}
                onPress={() => handlePresetPress(amount)}
              />
            ))}
          </FilterChipGroup>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6A65',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inputContainer: {
    paddingVertical: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingBottom: 12,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    color: '#A0AFAA',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1A',
    paddingVertical: 0,
    letterSpacing: -0.5,
  },
  underline: {
    height: 2,
    borderRadius: 1,
  },
  underlineDefault: {
    backgroundColor: '#EBEAE4',
  },
  underlineFocused: {
    backgroundColor: '#7BE899',
  },
  presetsContainer: {
    marginTop: 20,
  },
  presetsGroup: {
    paddingHorizontal: 0,
  },
});

export { CurrencyInput };
export type { CurrencyInputProps };
