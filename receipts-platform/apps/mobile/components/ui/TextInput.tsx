import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Animated,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  prefix?: string;
  suffixIcon?: keyof typeof Ionicons.glyphMap;
  onSuffixPress?: () => void;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

const TextInput = React.memo(function TextInput({
  label,
  value,
  onChangeText,
  prefix,
  suffixIcon,
  onSuffixPress,
  error,
  disabled = false,
  containerStyle,
  ...inputProps
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<RNTextInput>(null);

  const isRaised = isFocused || value.length > 0;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [labelAnim, borderAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [labelAnim, borderAnim, value]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 6],
  });

  const labelSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 12],
  });

  const labelOpacity = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const borderColor = error
    ? '#D4634B'
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#EBEAE4', '#7BE899'],
      });

  const borderWidth = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[styles.wrapper, containerStyle]}
      disabled={disabled}
    >
      <View style={[styles.container, disabled && styles.disabled]}>
        {/* Floating label */}
        <Animated.Text
          style={[
            styles.label,
            {
              top: labelTop,
              fontSize: labelSize,
              opacity: labelOpacity,
              color: error ? '#D4634B' : isFocused ? '#4A5D4E' : '#6B6A65',
            },
            prefix ? { left: 32 } : undefined,
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

        <View style={styles.inputRow}>
          {prefix && (
            <Text style={[styles.prefix, isRaised && styles.prefixActive]}>
              {prefix}
            </Text>
          )}

          <RNTextInput
            ref={inputRef}
            style={[styles.input, prefix && styles.inputWithPrefix]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            placeholderTextColor="#A0AFAA"
            selectionColor="#7BE899"
            {...inputProps}
          />

          {suffixIcon && (
            <Pressable onPress={onSuffixPress} style={styles.suffixButton}>
              <Ionicons name={suffixIcon} size={20} color="#6B6A65" />
            </Pressable>
          )}
        </View>

        {/* Animated underline */}
        <Animated.View
          style={[
            styles.underline,
            {
              backgroundColor: borderColor as any,
              height: borderWidth as any,
            },
          ]}
        />
      </View>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    height: 56,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  prefix: {
    fontSize: 17,
    fontWeight: '400',
    color: '#A0AFAA',
    marginRight: 2,
    paddingTop: 14,
  },
  prefixActive: {
    color: '#1C1C1A',
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: '#1C1C1A',
    paddingTop: 14,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  inputWithPrefix: {
    marginLeft: 0,
  },
  suffixButton: {
    paddingTop: 14,
    paddingLeft: 8,
  },
  underline: {
    width: '100%',
    borderRadius: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#D4634B',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

export { TextInput };
export type { TextInputProps };
