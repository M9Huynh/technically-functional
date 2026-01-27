import React, { useState } from "react";
import { Text, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/screenContainer";
import AppLogo from "../../components/appLogo";
import PrimaryButton from "../../components/primaryButton";

export default function CreatePhysio() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [license, setLicense] = useState("");

  return (
    <ScreenContainer>
      <AppLogo small />

      <Text style={styles.title}>Create Account - Physiotherapist</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="example@clinic.com"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="********"
        secureTextEntry
      />

      <Text style={styles.label}>License Number (required)</Text>
      <TextInput
        style={styles.input}
        value={license}
        onChangeText={setLicense}
        placeholder="e.g., ON-123456"
        autoCapitalize="characters"
      />

      <PrimaryButton
        label="Create Account"
        onPress={() => router.replace("/(tabs)")}
        style={{ marginTop: 18 }}
      />

      <PrimaryButton
        label="Back"
        onPress={() => router.back()}
        style={{ marginTop: 10, backgroundColor: "#444" }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  label: { fontSize: 14, color: "#333", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 },
});
