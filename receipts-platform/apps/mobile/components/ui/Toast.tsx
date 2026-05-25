import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  show: (toast: Omit<ToastMessage, 'id'>) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// --- Toast Item Component ---

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const ToastItem = React.memo(function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slide in with spring
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        speed: 14,
        bounciness: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const duration = toast.duration ?? 3000;
    timerRef.current = setTimeout(() => {
      dismissWithAnimation();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismissWithAnimation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: -120,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [translateY, opacity, onDismiss]);

  const variantStyle = variantStyles[toast.variant];

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        variantStyle.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.toastContent}>
        <View style={[styles.indicator, variantStyle.indicator]} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, variantStyle.title]}>{toast.title}</Text>
          {toast.message && (
            <Text style={[styles.message, variantStyle.message]}>{toast.message}</Text>
          )}
        </View>
        <Pressable
          onPress={dismissWithAnimation}
          style={styles.dismissButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Text style={[styles.dismissText, variantStyle.dismiss]}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// --- Toast Provider ---

interface ToastProviderProps {
  children: React.ReactNode;
}

const ToastProvider = React.memo(function ToastProvider({ children }: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);

  const show = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setCurrentToast({ ...toast, id });
  }, []);

  const dismiss = useCallback(() => {
    setCurrentToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {currentToast && (
        <View style={styles.overlay} pointerEvents="box-none">
          <ToastItem toast={currentToast} onDismiss={dismiss} />
        </View>
      )}
    </ToastContext.Provider>
  );
});

// --- Styles ---

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  toastContainer: {
    width: SCREEN_WIDTH - 32,
    maxWidth: 420,
    borderRadius: 14,
    shadowColor: '#242D28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  indicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const variantStyles = {
  success: StyleSheet.create({
    container: {
      backgroundColor: '#F0FDF4',
      borderWidth: 1,
      borderColor: '#7BE89940',
    },
    indicator: {
      backgroundColor: '#7BE899',
    },
    title: {
      color: '#1C1C1A',
    },
    message: {
      color: '#4A5D4E',
    },
    dismiss: {
      color: '#82907A',
    },
  }),
  error: StyleSheet.create({
    container: {
      backgroundColor: '#FDF6F4',
      borderWidth: 1,
      borderColor: '#D4634B30',
    },
    indicator: {
      backgroundColor: '#D4634B',
    },
    title: {
      color: '#1C1C1A',
    },
    message: {
      color: '#6B6A65',
    },
    dismiss: {
      color: '#6B6A65',
    },
  }),
  info: StyleSheet.create({
    container: {
      backgroundColor: '#F7F6F2',
      borderWidth: 1,
      borderColor: '#EBEAE4',
    },
    indicator: {
      backgroundColor: '#242D28',
    },
    title: {
      color: '#1C1C1A',
    },
    message: {
      color: '#6B6A65',
    },
    dismiss: {
      color: '#6B6A65',
    },
  }),
};

export { ToastProvider, useToast, ToastItem };
export type { ToastMessage, ToastVariant, ToastContextValue };
