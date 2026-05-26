import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useColors } from "../../lib/config-provider";

export default function UploadScreen() {
  const router = useRouter();
  const colors = useColors();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"uploading" | "processing" | "success" | null>(null);

  async function uploadImage(uri: string, fileName: string) {
    setUploading(true);
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName || "receipt.jpg",
        type: "image/jpeg",
      } as any);

      setUploadStatus("processing");

      await api<{ jobId: string; status: string }>("/api/mobile/upload", {
        method: "POST",

        body: formData,
      });

      setUploadStatus("success");

      // Brief pause to show success state before navigating
      setTimeout(() => {
        router.replace("/(tabs)/receipts");
      }, 1500);
    } catch {
      setUploadStatus(null);
      Alert.alert("Upload Failed", "Could not upload your receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadImage(asset.uri, asset.fileName ?? "receipt.jpg");
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadImage(asset.uri, asset.fileName ?? "photo.jpg");
    }
  }

  function getStatusText() {
    switch (uploadStatus) {
      case "uploading":
        return "Uploading...";
      case "processing":
        return "Processing with AI...";
      case "success":
        return "Receipt processed successfully!";
      default:
        return "";
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 16,
        paddingTop: 60,
        gap: 16,
      }}
    >
      {/* Back button */}
      <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} style={{ position: "absolute", top: 56, left: 16, zIndex: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        <Text style={{ color: colors.onSurface, fontSize: 16 }}>Back</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.onSurface }}>
        Scan Receipt
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, textAlign: "center" }}>
        Take a photo or select an image of your receipt
      </Text>

      {uploadStatus ? (
        <View style={{ marginTop: 24, alignItems: "center", gap: 12 }}>
          {uploadStatus === "success" ? (
            <Text style={{ fontSize: 40 }}>✓</Text>
          ) : (
            <ActivityIndicator size="large" color={colors.secondary} />
          )}
          <Text
            style={{
              color: uploadStatus === "success" ? colors.secondary : colors.onSurfaceVariant,
              fontWeight: uploadStatus === "success" ? "600" : "400",
            }}
          >
            {getStatusText()}
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={takePhoto}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
              width: "100%",
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600" }}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickImage}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
              width: "100%",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.onSurface }}>Choose from Library</Text>
          </TouchableOpacity>
        </>
      )}
      </View>
    </View>
  );
}
