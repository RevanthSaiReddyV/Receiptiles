import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toggle } from "../components/ui/Toggle";
import { Card } from "../components/ui/Card";

interface DataItem {
  title: string;
  description: string;
  icon: string;
}

const dataCollected: DataItem[] = [
  {
    title: "Receipts",
    description:
      "Purchase history from connected retailers, email imports, and manual uploads.",
    icon: "🧾",
  },
  {
    title: "Location",
    description:
      "Approximate location used to match nearby merchants and improve suggestions.",
    icon: "📍",
  },
  {
    title: "Spending Patterns",
    description:
      "Aggregated spending trends derived from your transaction history.",
    icon: "📊",
  },
];

export default function PrivacyCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [anonymizedAnalytics, setAnonymizedAnalytics] = useState(true);
  const [personalizedOffers, setPersonalizedOffers] = useState(false);
  const [thirdPartySharing, setThirdPartySharing] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Center</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Your Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Data</Text>
        <Text style={styles.sectionDescription}>
          Here is what data we collect and how it is used.
        </Text>
        {dataCollected.map((item) => (
          <Card key={item.title} variant="outlined" style={styles.dataCard}>
            <View style={styles.dataCardRow}>
              <Text style={styles.dataIcon}>{item.icon}</Text>
              <View style={styles.dataCardContent}>
                <Text style={styles.dataCardTitle}>{item.title}</Text>
                <Text style={styles.dataCardDesc}>{item.description}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* Data Sharing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sharing</Text>
        <Text style={styles.sectionDescription}>
          Control how your data is shared and used.
        </Text>
        <Card variant="outlined" style={styles.toggleCard}>
          <Toggle
            value={anonymizedAnalytics}
            onValueChange={setAnonymizedAnalytics}
            label="Anonymized Analytics"
            sublabel="Help us improve the app with anonymous usage data."
          />
          <View style={styles.divider} />
          <Toggle
            value={personalizedOffers}
            onValueChange={setPersonalizedOffers}
            label="Personalized Offers"
            sublabel="Receive card and savings recommendations based on your spending."
          />
          <View style={styles.divider} />
          <Toggle
            value={thirdPartySharing}
            onValueChange={setThirdPartySharing}
            label="Third-party Sharing"
            sublabel="Allow anonymized data to be shared with trusted partners."
          />
        </Card>
      </View>

      {/* Your Rights Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Card variant="outlined" padding={0} style={styles.rightsCard}>
          <TouchableOpacity
            style={styles.rightsRow}
            onPress={() => router.push("/data-export" as any)}
          >
            <Text style={styles.rightsIcon}>📥</Text>
            <Text style={styles.rightsLabel}>Download My Data</Text>
            <Text style={styles.rightsArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.rightsDivider} />
          <TouchableOpacity style={styles.rightsRow}>
            <Text style={styles.rightsIcon}>🗑️</Text>
            <Text style={[styles.rightsLabel, styles.dangerText]}>
              Delete My Account
            </Text>
            <Text style={styles.rightsArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.rightsDivider} />
          <TouchableOpacity
            style={styles.rightsRow}
            onPress={() =>
              Linking.openURL("https://receipts.app/privacy-policy")
            }
          >
            <Text style={styles.rightsIcon}>📄</Text>
            <Text style={styles.rightsLabel}>View Privacy Policy</Text>
            <Text style={styles.rightsArrow}>›</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Bottom link */}
      <TouchableOpacity
        style={styles.bottomLink}
        onPress={() => Linking.openURL("https://receipts.app/privacy-policy")}
      >
        <Text style={styles.bottomLinkText}>
          Read our full Privacy Policy
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 28,
    color: "#101814",
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#101814",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#101814",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#434845",
    marginBottom: 12,
  },
  dataCard: {
    marginBottom: 10,
    borderColor: "#c3c8c3",
  },
  dataCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dataIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  dataCardContent: {
    flex: 1,
  },
  dataCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#101814",
    marginBottom: 2,
  },
  dataCardDesc: {
    fontSize: 13,
    color: "#434845",
    lineHeight: 18,
  },
  toggleCard: {
    borderColor: "#c3c8c3",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#e3e2df",
  },
  rightsCard: {
    borderColor: "#c3c8c3",
    overflow: "hidden",
  },
  rightsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  rightsIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  rightsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#101814",
  },
  rightsArrow: {
    fontSize: 18,
    color: "#c3c8c3",
  },
  rightsDivider: {
    height: 1,
    backgroundColor: "#e3e2df",
    marginHorizontal: 14,
  },
  dangerText: {
    color: "#ba1a1a",
  },
  bottomLink: {
    alignItems: "center",
    paddingVertical: 16,
    marginHorizontal: 20,
  },
  bottomLinkText: {
    fontSize: 14,
    color: "#434845",
    textDecorationLine: "underline",
  },
});
