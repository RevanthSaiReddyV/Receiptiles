import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar, LogBox, View } from "react-native";
import { registerForPushNotifications } from "../lib/notifications";
import { handleDeepLink } from "../lib/deep-link";
import { ConfigProvider, useAppThemeContext } from "../lib/config-provider";
import * as Linking from "expo-linking";

LogBox.ignoreLogs(["API error 401", "API error 403", "Network request failed"]);

function InnerLayout() {
  const { colors, isDark } = useAppThemeContext();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="signup" options={{ animation: "fade" }} />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: true, title: "Receipt" }} />
        <Stack.Screen name="cards" options={{ headerShown: true, title: "Cards & Rewards", presentation: "modal" }} />
        <Stack.Screen name="claim/[token]" options={{ headerShown: true, title: "Claim Receipt", presentation: "modal" }} />
        <Stack.Screen name="wallet" options={{ headerShown: true, title: "Wallet Pass", presentation: "modal" }} />
        <Stack.Screen name="deals" options={{ headerShown: true, title: "Deals & Offers", presentation: "modal" }} />
        <Stack.Screen name="warranties" options={{ headerShown: true, title: "Warranties & Returns", presentation: "modal" }} />
        <Stack.Screen name="connections" options={{ headerShown: true, title: "Connections" }} />
        <Stack.Screen name="subscriptions" options={{ headerShown: true, title: "Subscriptions" }} />
        <Stack.Screen name="upload" options={{ headerShown: true, title: "Scan Receipt" }} />
        <Stack.Screen name="privacy" options={{ headerShown: true, title: "Privacy Center" }} />
        <Stack.Screen name="data-export" options={{ headerShown: true, title: "Export Data" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications();

    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ConfigProvider>
        <InnerLayout />
      </ConfigProvider>
    </SafeAreaProvider>
  );
}
