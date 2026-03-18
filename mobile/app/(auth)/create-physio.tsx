import React, { useState } from "react";
import { Text, StyleSheet, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { registerPhysio, checkEmailExists } from "../../lib/authService";
import ScreenContainer from "../../components/screenContainer";
import AppLogo from "../../components/appLogo";
import PrimaryButton from "../../components/primaryButton";

export default function CreatePhysio() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  ////// new
  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };


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
      <Text style={styles.passwordHint}>Password must be at least 6 characters and contain at least one number</Text>

      <Text style={styles.label}>License Number (required)</Text>
      <TextInput
        style={styles.input}
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        placeholder="e.g., ON-123456"
        autoCapitalize="characters"
      />

      <PrimaryButton
        label="Create Account"
        onPress={async () => {
          try {
            setLoading(true);
            // email exists check
            const emailExists = await checkEmailExists(email);
            
            if (emailExists) {
              Alert.alert(
                "Account Already Exists", 
                "An account with this email already exists. Please use a different email or try logging in."
            );
            setLoading(false);
            return;
          }
            await registerPhysio({
              name,
              email,
              password,
              licenseNumber,
            });
            router.replace("/(tabs)");
          } catch (e: any) {
            Alert.alert("Create Account Failed", e?.message ?? "Unknown error");
          } finally {
            setLoading(false);
          }
        }}
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
  passwordHint: { fontSize: 12, color: "#666", marginTop: 4, marginBottom: 8, fontStyle: "italic" }
});
