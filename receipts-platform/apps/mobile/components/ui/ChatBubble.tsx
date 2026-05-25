import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';

interface ActionButton {
  label: string;
  onPress: () => void;
}

interface StatHighlight {
  text: string;
  value: string;
}

interface ChatBubbleProps {
  role: 'user' | 'ai';
  message?: string;
  timestamp?: string;
  isTyping?: boolean;
  stats?: StatHighlight[];
  actions?: ActionButton[];
}

const TypingIndicator = React.memo(function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    createPulse(dot1, 0).start();
    createPulse(dot2, 150).start();
    createPulse(dot3, 300).start();

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
});

const ChatBubble = React.memo(function ChatBubble({
  role,
  message,
  timestamp,
  isTyping = false,
  stats,
  actions,
}: ChatBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();
  }, []);

  const isUser = role === 'user';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        isUser ? styles.wrapperUser : styles.wrapperAI,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
        ]}
      >
        {isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            {message && (
              <Text
                style={[
                  styles.message,
                  isUser ? styles.messageUser : styles.messageAI,
                ]}
              >
                {message}
              </Text>
            )}

            {stats && stats.length > 0 && (
              <View style={styles.statsContainer}>
                {stats.map((stat, i) => (
                  <View key={i} style={styles.statRow}>
                    <Text style={styles.statText}>{stat.text} </Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {actions && actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {actions.map((action, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.actionButton}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {timestamp && (
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.timestampUser : styles.timestampAI,
          ]}
        >
          {timestamp}
        </Text>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  wrapperUser: {
    alignSelf: 'flex-end',
  },
  wrapperAI: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#242D28',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#F0EFEB',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageUser: {
    color: '#FFFFFF',
  },
  messageAI: {
    color: '#1C1C1A',
  },
  timestamp: {
    fontSize: 10,
    color: '#6B6A65',
    marginTop: 4,
  },
  timestampUser: {
    textAlign: 'right',
  },
  timestampAI: {
    textAlign: 'left',
  },
  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#82907A',
  },
  // Stats
  statsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EBEAE4',
    paddingTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: '#1C1C1A',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7BE899',
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBEAE4',
  },
  actionLabel: {
    fontSize: 13,
    color: '#4A5D4E',
    fontWeight: '600',
  },
});

export { ChatBubble };
export type { ChatBubbleProps, ActionButton, StatHighlight };
