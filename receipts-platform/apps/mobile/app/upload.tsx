import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "../lib/api";

export default function UploadScreen() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function uploadImage(uri: string, fileName: string) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName || "receipt.jpg",
        type: "image/jpeg",
      } as unknown as Blob);

      await api<{ jobId: string; status: string }>("/api/mobile/upload", {
        method: "POST",
        headers: {},
        body: formData,
      });

      Alert.alert(
        "Upload Successful",
        "Your receipt is being processed. It will appear in your receipts shortly.",
        [{ text: "OK", onPress: () => router.push("/receipts") }]
      );
    } catch {
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

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f9fafb",
        padding: 16,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Upload Receipt</Text>
      <Text style={{ color: "#6b7280", textAlign: "center" }}>
        Take a photo or select an image of your receipt
      </Text>

      {uploading ? (
        <View style={{ marginTop: 24, alignItems: "center", gap: 12 }}>
          <ActivityIndicator size="large" />
          <Text style={{ color: "#6b7280" }}>Processing your receipt...</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={takePhoto}
            style={{
              backgroundColor: "#000",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
              width: "100%",
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickImage}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
              width: "100%",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ fontWeight: "600" }}>Choose from Library</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
