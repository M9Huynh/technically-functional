import React, { useState } from "react";
import { Text, StyleSheet, TextInput, Pressable, View, Alert } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { login } from "../../lib/authService";
import ScreenContainer from "../../components/screenContainer";
import AppLogo from "../../components/appLogo";
import PrimaryButton from "../../components/primaryButton";
import { setUserRole } from "../../lib/roleStore";

type Role = "patient" | "physio";

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as Role) || "patient";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const helperText = role === "physio" ? "Physiotherapist login" : "Patient login";
  const createRoute = role === "physio" ? "/(auth)/create-physio" : "/(auth)/create-patient";

  return (
    <ScreenContainer>
      <AppLogo />

      <Text style={styles.sub}>{helperText}</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="example@mcmaster.ca"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="********"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <PrimaryButton
        label="Login"
        onPress={async () => {
          try {
            // ✅ persist role so tabs/home can use it
            await setUserRole(role);

            await login(email, password);
            router.replace("/(tabs)");
          } catch (e: any) {
            Alert.alert("Login Failed", e?.message ?? "Unknown error");
          }
        }}
        style={{ marginTop: 18 }}
      />

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>No Account?</Text>
      <Text style={styles.smallText}>
        {role === "patient"
          ? "If you’ve been given an invite code from your physiotherapist, create an account:"
          : "If you are a physiotherapist looking to assist patients, create an account:"}
      </Text>

      <Link href={createRoute as any} asChild>
        <Pressable style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>
            {role === "patient" ? "Create Patient Account" : "Create Physio Account"}
          </Text>
        </Pressable>
      </Link>

      <Link href="/(auth)/role-select" asChild>
        <Pressable style={[styles.linkBtn, { marginTop: 14 }]}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>
      </Link>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sub: { textAlign: "center", color: "#666", marginBottom: 10, fontSize: 16 },
  label: { fontSize: 14, color: "#333", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  smallText: { color: "#666", marginBottom: 12 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: { fontWeight: "700", color: "#222" },
  linkBtn: { alignItems: "center" },
  linkText: { color: "#666" },
});
