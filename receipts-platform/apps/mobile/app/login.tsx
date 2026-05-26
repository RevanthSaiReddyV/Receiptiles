import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, apiPost, setToken } from "../lib/api";
import { useColors } from "../lib/config-provider";
import { MarqueeBackground } from "../components/ui/MarqueeBackground";
import { track, Events } from "../lib/analytics";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true);
    try {
      const result = await api<{ token: string }>("/api/mobile/auth", { method: "POST", body: JSON.stringify({ email, password, action: "login" }) });
      await setToken(result.token);
      track(Events.LOGIN_SUCCESS, { method: "email" });
      apiPost("/api/mobile/sync", {}).catch(() => {});
      router.replace("/(tabs)");
    } catch { setError("Invalid email or password."); track(Events.LOGIN_FAILED, { method: "email" }); } finally { setLoading(false); }
  }

  async function handleGoogleLogin() {
    setError(""); setLoading(true);
    try {
      const callbackScheme = "receipts";

      // Use openAuthSessionAsync — iOS will handle the custom scheme redirect
      const authUrl = `${API_URL}/api/mobile/auth/google-redirect?redirect=${encodeURIComponent(callbackScheme + "://auth")}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackScheme + "://auth");

      if (result.type === "success" && result.url) {
        const params = new URLSearchParams(result.url.split("?")[1] || "");
        const token = params.get("token");
        if (token) {
          await setToken(token);
          track(Events.LOGIN_SUCCESS, { method: "google" });
          apiPost("/api/mobile/sync", {}).catch(() => {});
          router.replace("/(tabs)");
          return;
        }
        const err = params.get("error");
        setError(err ? `Sign-in failed: ${err}` : "No token received.");
      } else if (result.type !== "cancel") {
        setError("Google sign-in was cancelled.");
      }
    } catch (e: any) {
      setError(`Error: ${e?.message || "unknown"}`);
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[st.container, { backgroundColor: colors.background }]}>
      <MarqueeBackground />
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <View style={[st.iconBox, { backgroundColor: colors.primaryContainer }]}><Ionicons name="receipt-outline" size={26} color={colors.secondary} /></View>
          <Text style={[st.brand, { color: colors.onSurface }]}>Receiptiles</Text>
        </View>
        <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <Text style={[st.cardTitle, { color: colors.onSurface }]}>Welcome Back</Text>
          <Text style={[st.cardSub, { color: colors.onSurfaceVariant }]}>Please enter your details to sign in.</Text>
          {error ? <Text style={st.error}>{error}</Text> : null}
          <Text style={[st.label, { color: colors.onSurface }]}>Email Address</Text>
          <View style={[st.inputWrap, { borderColor: colors.outlineVariant, backgroundColor: colors.background }]}>
            <Ionicons name="mail" size={18} color={colors.outline} />
            <TextInput style={[st.input, { color: colors.onSurface }]} placeholder="name@example.com" placeholderTextColor={colors.outline} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={st.labelRow}><Text style={[st.label, { color: colors.onSurface }]}>Password</Text><Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>Forgot password?</Text></View>
          <View style={[st.inputWrap, { borderColor: colors.outlineVariant, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed" size={18} color={colors.outline} />
            <TextInput style={[st.input, { color: colors.onSurface }]} placeholder="Enter your password" placeholderTextColor={colors.outline} value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          <TouchableOpacity style={st.primaryBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#101814" /> : <Text style={st.primaryBtnText}>Sign In</Text>}
          </TouchableOpacity>
          <View style={st.divider}><View style={[st.line, { backgroundColor: colors.outlineVariant }]} /><Text style={{ color: colors.outline, fontSize: 12, marginHorizontal: 12 }}>Or</Text><View style={[st.line, { backgroundColor: colors.outlineVariant }]} /></View>
          <TouchableOpacity style={[st.socialBtn, { borderColor: colors.outlineVariant }]} onPress={handleGoogleLogin} activeOpacity={0.7}>
            <Ionicons name="logo-google" size={18} color={colors.onSurface} />
            <Text style={[st.socialText, { color: colors.onSurface }]}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
        <View style={st.footer}><Text style={{ color: colors.onSurfaceVariant }}>Don't have an account? </Text><TouchableOpacity onPress={() => router.replace("/signup")}><Text style={{ color: colors.onSurface, fontWeight: "700" }}>Sign up</Text></TouchableOpacity></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 40 },
  header: { alignItems: "center", marginBottom: 32, gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  brand: { fontSize: 36, fontWeight: "400", letterSpacing: -1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: "600", textAlign: "center" },
  cardSub: { fontSize: 15, textAlign: "center", marginTop: 4, marginBottom: 20 },
  error: { color: "#D4634B", fontSize: 13, textAlign: "center", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6, marginTop: 12 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, fontSize: 15 },
  primaryBtn: { backgroundColor: "#89f6a6", borderRadius: 999, height: 48, justifyContent: "center", alignItems: "center", marginTop: 20 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#101814" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  line: { flex: 1, height: 1 },
  socialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 999, borderWidth: 1.5, gap: 10, marginBottom: 10 },
  socialText: { fontSize: 15, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
});
