import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  Animated,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onCancel?: () => void;
  containerStyle?: ViewStyle;
  autoFocus?: boolean;
}

const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onFocus,
  onBlur,
  onCancel,
  containerStyle,
  autoFocus = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cancelAnim = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChangeText(text);
      }, 300);
      // Update immediately for local display
      onChangeText(text);
    },
    [onChangeText]
  );

  // Actually debounce properly: local state for immediate display, debounce for callback
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChangeText(text);
      }, 300);
    },
    [onChangeText]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cancelAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onFocus?.();
  }, [scaleAnim, cancelAnim, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cancelAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onBlur?.();
  }, [scaleAnim, cancelAnim, onBlur]);

  const handleCancel = useCallback(() => {
    setLocalValue('');
    onChangeText('');
    inputRef.current?.blur();
    onCancel?.();
  }, [onChangeText, onCancel]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeText('');
    inputRef.current?.focus();
  }, [onChangeText]);

  const cancelTranslateX = cancelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const cancelOpacity = cancelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Animated.View
        style={[
          styles.container,
          isFocused && styles.containerFocused,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={isFocused ? '#4A5D4E' : '#82907A'}
          style={styles.searchIcon}
        />

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={localValue}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#A0AFAA"
          selectionColor="#7BE899"
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          returnKeyType="search"
        />

        {localValue.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <View style={styles.clearCircle}>
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </View>
          </Pressable>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.cancelContainer,
          {
            transform: [{ translateX: cancelTranslateX }],
            opacity: cancelOpacity,
          },
        ]}
        pointerEvents={isFocused ? 'auto' : 'none'}
      >
        <Pressable onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    height: 44,
    backgroundColor: '#F0EFEB',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  containerFocused: {
    backgroundColor: '#EBEAE4',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1A',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#A0AFAA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelContainer: {
    marginLeft: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5D4E',
  },
});

export { SearchBar };
export type { SearchBarProps };
