import { Animated, Easing } from "react-native";
import { useRef, useEffect } from "react";

// Website animation curves translated to React Native
const CURVES = {
  smooth: Easing.bezier(0.16, 1, 0.3, 1),
  scan: Easing.bezier(0.4, 0, 0.2, 1),
  spring: { friction: 8, tension: 65 },
  springBouncy: { friction: 5, tension: 80 },
};

export function useFadeInUp(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: CURVES.smooth,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          easing: CURVES.smooth,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return { opacity, transform: [{ translateY }] };
}

export function useFloat() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return { transform: [{ translateY }] };
}

export function usePulse() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return { opacity };
}

export function useScaleOnPress() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      ...CURVES.spring,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...CURVES.springBouncy,
    }).start();
  };

  return { scale, onPressIn, onPressOut };
}

export function useProgressAnimation(targetValue: number, duration = 1200) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: targetValue,
      duration,
      easing: CURVES.smooth,
      useNativeDriver: false,
    }).start();
  }, [targetValue]);

  return progress;
}

export function useStaggeredFadeIn(count: number, staggerDelay = 80) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(10),
    }))
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: i * staggerDelay,
          easing: CURVES.smooth,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 400,
          delay: i * staggerDelay,
          easing: CURVES.smooth,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  return anims;
}
