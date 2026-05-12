import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#000",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="receipts"
        options={{ title: "Receipts", tabBarLabel: "Receipts" }}
      />
      <Tabs.Screen
        name="upload"
        options={{ title: "Upload", tabBarLabel: "Upload" }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{ title: "Subscriptions", tabBarLabel: "Subs" }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: "Insights", tabBarLabel: "Insights" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarLabel: "Settings" }}
      />
    </Tabs>
  );
}
