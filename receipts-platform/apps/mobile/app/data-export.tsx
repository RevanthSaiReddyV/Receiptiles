import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterChip } from "../components/ui/FilterChip";
import { Card } from "../components/ui/Card";

type ExportFormat = "CSV" | "JSON" | "PDF";

export default function DataExportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("CSV");
  const [lastExport] = useState<string | null>(null); // Replace with real data

  const handleRequestExport = () => {
    Alert.alert(
      "Export Requested",
      `Your data export in ${selectedFormat} format has been requested. You'll receive an email with your download link within 24 hours.`,
      [{ text: "OK" }]
    );
  };

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
        <Text style={styles.headerTitle}>Export Your Data</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Description */}
      <View style={styles.content}>
        <Text style={styles.description}>
          Download all your receipts, transactions, and account data.
        </Text>

        {/* Format Selector */}
        <Text style={styles.label}>Export Format</Text>
        <View style={styles.chipRow}>
          {(["CSV", "JSON", "PDF"] as ExportFormat[]).map((format) => (
            <FilterChip
              key={format}
              label={format}
              selected={selectedFormat === format}
              onPress={() => setSelectedFormat(format)}
            />
          ))}
        </View>

        {/* Request Export Button */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleRequestExport}
          activeOpacity={0.8}
        >
          <Text style={styles.exportButtonText}>Request Export</Text>
        </TouchableOpacity>

        {/* Status Section */}
        <Card variant="outlined" style={styles.statusCard}>
          <Text style={styles.statusTitle}>Export Status</Text>
          {lastExport ? (
            <Text style={styles.statusText}>
              Your last export was on {lastExport}
            </Text>
          ) : (
            <Text style={styles.statusText}>No exports yet</Text>
          )}
        </Card>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            You'll receive an email with your download link within 24 hours.
          </Text>
        </View>
      </View>
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
  content: {
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 15,
    color: "#434845",
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#101814",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: 28,
  },
  exportButton: {
    backgroundColor: "#242d28",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  statusCard: {
    borderColor: "#c3c8c3",
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#101814",
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#434845",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#c3c8c3",
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#434845",
    lineHeight: 18,
  },
});
