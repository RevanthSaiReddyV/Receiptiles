import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#171717",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f3f4f6",
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#fafafa",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Budgets",
          tabBarLabel: "Budgets",
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Scan",
          tabBarLabel: "Scan",
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarLabel: "Rewards",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "More",
          tabBarLabel: "More",
        }}
      />
      {/* Hidden from tab bar but accessible via navigation */}
      <Tabs.Screen
        name="connections"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="receipts"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="insights"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{ href: null }}
      />
    </Tabs>
  );
}
