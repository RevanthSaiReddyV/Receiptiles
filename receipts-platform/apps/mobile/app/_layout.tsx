import { Stack } from "expo-router";
import { useEffect } from "react";
import { registerForPushNotifications } from "../lib/notifications";
import { handleDeepLink } from "../lib/deep-link";
import * as Linking from "expo-linking";

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications();

    // Handle deep links (NFC tap → Universal Link → claim receipt)
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ presentation: "modal" }} />
      <Stack.Screen name="signup" options={{ presentation: "modal" }} />
      <Stack.Screen name="receipt/[id]" options={{ headerShown: true, title: "Receipt" }} />
      <Stack.Screen name="cards" options={{ headerShown: true, title: "Cards & Rewards", presentation: "modal" }} />
      <Stack.Screen name="claim/[token]" options={{ headerShown: true, title: "Claim Receipt", presentation: "modal" }} />
      <Stack.Screen name="wallet" options={{ headerShown: true, title: "Wallet Pass", presentation: "modal" }} />
    </Stack>
  );
}
