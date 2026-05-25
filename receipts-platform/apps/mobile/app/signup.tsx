import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, setToken } from "../lib/api";
import { useColors } from "../lib/config-provider";

export default function SignupScreen() {
  const router = useRouter();
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await api<{ token: string }>("/api/mobile/auth", {
        method: "POST",
        body: JSON.stringify({ email, password, name, action: "signup" }),
      });

      await setToken(result.token);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("409")) {
        setError("An account with this email already exists.");
      } else {
        setError("Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="receipt-outline" size={26} color="#ffffff" />
          </View>
          <Text style={styles.brandName}>Receiptiles</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Create Account</Text>
          <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
            Enter your details to get started.
          </Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person"
                size={18}
                color="#747874"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="John Doe"
                placeholderTextColor="#747874"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                style={styles.input}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail"
                size={18}
                color="#747874"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor="#747874"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={styles.input}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed"
                size={18}
                color="#747874"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="8+ characters"
                placeholderTextColor="#747874"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                style={styles.input}
              />
            </View>
          </View>

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#007238" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
            <Ionicons name="logo-google" size={18} color="#1b1c1a" />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Apple */}
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
            <Ionicons name="logo-apple" size={20} color="#1b1c1a" />
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1b1c1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 36,
    fontWeight: "400",
    color: "#1b1c1a",
    letterSpacing: -1,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c3c8c3",
    padding: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1b1c1a",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 16,
    color: "#434845",
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1b1c1a",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c3c8c3",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1b1c1a",
    height: 48,
  },
  errorText: {
    fontSize: 14,
    color: "#D4634B",
    marginBottom: 16,
    marginTop: -4,
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    backgroundColor: "#89f6a6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#89f6a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007238",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#c3c8c3",
  },
  dividerText: {
    fontSize: 13,
    color: "#747874",
    marginHorizontal: 14,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#242d28",
    backgroundColor: "#ffffff",
    marginBottom: 12,
    gap: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1b1c1a",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#434845",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#101814",
  },
});
