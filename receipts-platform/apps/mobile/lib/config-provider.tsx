import { createContext, useContext, type ReactNode } from "react";
import { View, Text } from "react-native";
import { useRemoteConfig, DEFAULT_CONFIG, type RemoteConfig } from "./remote-config";
import { useAppTheme, type ThemeMode } from "./use-app-theme";
import { lightColors, type ThemeColors } from "./theme-colors";

// -------------------------------------------------------------------
// Remote config theme context (legacy — kept for backwards compat)
// -------------------------------------------------------------------

type Theme = RemoteConfig["theme"];

const ThemeContext = createContext<Theme>(DEFAULT_CONFIG.theme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

// -------------------------------------------------------------------
// App color theme context (new — dark mode system)
// -------------------------------------------------------------------

interface AppThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const AppThemeContext = createContext<AppThemeContextValue>({
  colors: lightColors,
  isDark: false,
  mode: "light",
  setTheme: () => {},
});

export function useColors(): ThemeColors {
  return useContext(AppThemeContext).colors;
}

export function useAppThemeContext(): AppThemeContextValue {
  return useContext(AppThemeContext);
}

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { config } = useRemoteConfig();
  const appTheme = useAppTheme();

  if (config.maintenance.enabled) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#faf9f5", padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔧</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#101814", textAlign: "center" }}>
          Under Maintenance
        </Text>
        <Text style={{ fontSize: 14, color: "#434845", textAlign: "center", marginTop: 8 }}>
          {config.maintenance.message || "We'll be back shortly."}
        </Text>
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={config.theme}>
      <AppThemeContext.Provider
        value={{
          colors: appTheme.colors,
          isDark: appTheme.isDark,
          mode: appTheme.mode,
          setTheme: appTheme.setTheme,
        }}
      >
        {children}
      </AppThemeContext.Provider>
    </ThemeContext.Provider>
  );
}
