import { useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, type ThemeColors } from "./theme-colors";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "app_theme";

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("light");
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setMode(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback(async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  // Resolve actual dark/light based on mode
  const isDark =
    mode === "dark" ? true : mode === "system" ? systemScheme === "dark" : false;

  const colors: ThemeColors = isDark ? darkColors : lightColors;

  return { colors, isDark, mode, setTheme, loaded };
}
