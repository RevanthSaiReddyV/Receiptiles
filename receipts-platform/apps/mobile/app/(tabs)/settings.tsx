import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { clearToken } from "../../lib/api";
import { Card } from "../../components/ui/Card";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  route?: string;
  action?: () => void;
}

export default function MoreScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          router.replace("/login");
        },
      },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Features",
      items: [
        { title: "All Receipts", subtitle: "View and search all receipts", icon: "🧾", route: "/(tabs)/receipts" },
        { title: "Insights", subtitle: "Spending charts and trends", icon: "📊", route: "/(tabs)/insights" },
        { title: "Subscriptions", subtitle: "Track recurring charges", icon: "🔄", route: "/(tabs)/subscriptions" },
        { title: "Cards & Wallet", subtitle: "Manage payment cards", icon: "💳", route: "/cards" },
        { title: "Apple Wallet", subtitle: "Receipt pass for Apple Wallet", icon: "📲", route: "/wallet" },
      ],
    },
    {
      title: "Connections",
      items: [
        { title: "Email (Gmail)", subtitle: "Auto-import receipt emails", icon: "📧" },
        { title: "Retailers", subtitle: "Costco, Amazon, Target & more", icon: "🏪" },
        { title: "POS Devices", subtitle: "Hardware receipt capture", icon: "🖨️" },
      ],
    },
    {
      title: "Account",
      items: [
        { title: "Profile", subtitle: "Name, email, password", icon: "👤" },
        { title: "Notifications", subtitle: "Budget alerts, renewal reminders", icon: "🔔" },
        { title: "Export Data", subtitle: "Download receipts as CSV", icon: "📤" },
        { title: "Log Out", subtitle: "", icon: "🚪", action: handleLogout },
      ],
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#171717" }}>More</Text>

        {sections.map((section) => (
          <View key={section.title} style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {section.title}
            </Text>
            <Card variant="outlined" padding={0} style={{ overflow: "hidden" }}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.title}
                  onPress={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderBottomWidth: idx < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#171717" }}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: "#d1d5db", fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <Text style={{ textAlign: "center", color: "#d1d5db", fontSize: 12, marginTop: 32 }}>
          Receipts v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
