import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "../../lib/config-provider";
import { clearToken } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { useAppThemeContext } from "../../lib/config-provider";
import type { ThemeMode } from "../../lib/use-app-theme";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  route?: string;
  action?: () => void;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "light", label: "Light", icon: "☀️" },
  { mode: "dark", label: "Dark", icon: "🌙" },
  { mode: "system", label: "System", icon: "📱" },
];

export default function MoreScreen() {
  const router = useRouter();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const { mode: themeMode, setTheme, colors } = useAppThemeContext();

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = () => {
    setDeleteModalVisible(false);
    // TODO: Call account deletion API
    Alert.alert(
      "Account Scheduled for Deletion",
      "Your account and all associated data will be permanently deleted within 30 days. You will receive a confirmation email."
    );
  };

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
        { title: "Subscriptions", subtitle: "Track recurring charges", icon: "🔄", route: "/subscriptions" },
        { title: "Cards & Wallet", subtitle: "Manage payment cards", icon: "💳", route: "/cards" },
        { title: "Apple Wallet", subtitle: "Receipt pass for Apple Wallet", icon: "📲", route: "/wallet" },
        { title: "Deals & Offers", subtitle: "Personalized offers from your spending", icon: "🎁", route: "/deals" },
        { title: "Warranties", subtitle: "Return windows & warranty tracking", icon: "🛡️", route: "/warranties" },
      ],
    },
    {
      title: "Connections",
      items: [
        { title: "All Retailers", subtitle: "Amazon, Walmart, Target & 20+ more", icon: "🏪", route: "/connections" },
        { title: "Email (Gmail)", subtitle: "Auto-import receipt emails", icon: "📧" },
        { title: "POS Devices", subtitle: "Hardware receipt capture", icon: "🖨️" },
      ],
    },
    {
      title: "Appearance",
      items: [], // Rendered custom — see below
    },
    {
      title: "Account",
      items: [
        { title: "Profile", subtitle: "Name, email, password", icon: "👤" },
        { title: "Notifications", subtitle: "Budget alerts, renewal reminders", icon: "🔔" },
        { title: "Privacy Center", subtitle: "Manage your data and permissions", icon: "🔒", route: "/privacy" },
        { title: "Export Data", subtitle: "Download receipts as CSV/JSON/PDF", icon: "📤", route: "/data-export" },
        { title: "Delete Account", subtitle: "Permanently remove your data", icon: "⚠️", action: handleDeleteAccount },
        { title: "Log Out", subtitle: "", icon: "🚪", action: handleLogout },
      ],
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.onSurface }}>More</Text>

        {sections.map((section) => (
          <View key={section.title} style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {section.title}
            </Text>

            {section.title === "Appearance" ? (
              <Card variant="outlined" padding={16} style={{ backgroundColor: colors.surface, borderColor: colors.outlineVariant }}>
                <View style={appearanceStyles.chipRow}>
                  {THEME_OPTIONS.map((opt) => {
                    const isSelected = themeMode === opt.mode;
                    return (
                      <TouchableOpacity
                        key={opt.mode}
                        onPress={() => setTheme(opt.mode)}
                        activeOpacity={0.7}
                        style={[
                          appearanceStyles.chip,
                          { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                          isSelected && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                        ]}
                      >
                        <Text style={appearanceStyles.chipIcon}>{opt.icon}</Text>
                        <Text
                          style={[
                            appearanceStyles.chipLabel,
                            { color: colors.onSurfaceVariant },
                            isSelected && { color: "#101814", fontWeight: "700" },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            ) : (
              <Card variant="outlined" padding={0} style={{ overflow: "hidden", backgroundColor: colors.surface, borderColor: colors.outlineVariant }}>
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
                      borderBottomColor: colors.outlineVariant,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.onSurface }}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ color: colors.outline, fontSize: 18 }}>›</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>
        ))}

        <Text style={{ textAlign: "center", color: colors.onSurfaceVariant, fontSize: 12, marginTop: 32 }}>
          Receipts v1.0.0
        </Text>
      </View>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { backgroundColor: colors.surface }]}>
            <Text style={modalStyles.icon}>⚠️</Text>
            <Text style={[modalStyles.title, { color: colors.onSurface }]}>Delete Account?</Text>
            <Text style={[modalStyles.message, { color: colors.onSurfaceVariant }]}>
              This action is irreversible. All your receipts, connections, and personal data will be permanently deleted within 30 days.
            </Text>
            <TouchableOpacity
              style={modalStyles.deleteButton}
              onPress={confirmDeleteAccount}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.deleteButtonText}>Delete My Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.cancelButton, { borderColor: colors.outlineVariant }]}
              onPress={() => setDeleteModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={[modalStyles.cancelButtonText, { color: colors.onSurface }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const appearanceStyles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#c3c8c3",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#434845",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#101814",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#434845",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteButton: {
    backgroundColor: "#ba1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c3c8c3",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#101814",
  },
});
