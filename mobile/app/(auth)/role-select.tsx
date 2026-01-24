import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function RoleSelect() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo / Title */}
        <Text style={styles.title}>Physio{"\n"}Companion</Text>

        <Text style={styles.subtitle}>Choose your role to continue</Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={() =>
            router.push({ pathname: "/(auth)/login", params: { role: "patient" } })
          }
        >
          <Text style={styles.primaryBtnText}>I’m a Patient</Text>
        </Pressable>

        <Pressable
          style={styles.primaryBtn}
          onPress={() =>
            router.push({ pathname: "/(auth)/login", params: { role: "physio" } })
          }
        >
          <Text style={styles.primaryBtnText}>I’m a Physiotherapist</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 22, justifyContent: "center" },
  title: { fontSize: 42, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 24, fontSize: 16 },

  primaryBtn: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
