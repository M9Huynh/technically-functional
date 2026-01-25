import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useLocalSearchParams, useRouter } from "expo-router";

type Role = "patient" | "physio";

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as Role) ?? "patient";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const createHref = role === "physio" ? "/(auth)/create-physio" : "/(auth)/create-patient";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Physio{"\n"}Companion</Text>

        <Text style={styles.sectionTitle}>
          Login ({role === "physio" ? "Physiotherapist" : "Patient"})
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="example@mcmaster.ca"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="********"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.primaryBtnText}>Login</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.smallText}>No account?</Text>

        <Link href={{ pathname: createHref, params: { role } }} asChild>
          <Pressable style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>
              {role === "physio" ? "Create Physio Account" : "Create Patient Account"}
            </Text>
          </Pressable>
        </Link>

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 22, justifyContent: "center" },

  title: { fontSize: 42, fontWeight: "800", textAlign: "center", marginBottom: 18 },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10, textAlign: "center" },

  label: { fontSize: 14, color: "#333", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 },

  primaryBtn: { backgroundColor: "#222", padding: 14, borderRadius: 10, marginTop: 18, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 18 },

  smallText: { color: "#666", marginBottom: 8 },
  secondaryBtn: { borderWidth: 1, borderColor: "#222", padding: 14, borderRadius: 10, alignItems: "center" },
  secondaryBtnText: { fontWeight: "700", color: "#222" },

  backBtn: { marginTop: 14, alignItems: "center" },
  backText: { color: "#666" },
});
