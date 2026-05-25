import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'dark' | 'accent';
  padding?: number;
}

const Card = React.memo(function Card({
  children,
  variant = 'elevated',
  padding = 16,
  style,
  ...props
}: CardProps) {
  return (
    <View style={[styles.base, variantStyles[variant], { padding }, style]} {...props}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
  },
});

const variantStyles = StyleSheet.create({
  elevated: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#242D28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  outlined: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEAE4',
  },
  dark: {
    backgroundColor: '#4A5D4E',
  },
  accent: {
    backgroundColor: '#E8FBF0',
  },
});

export { Card };
export type { CardProps };
