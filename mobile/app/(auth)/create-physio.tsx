import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function CreatePhysio() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [license, setLicense] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Physio Account</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />

        <Text style={styles.label}>License Number (required)</Text>
        <TextInput style={styles.input} value={license} onChangeText={setLicense} placeholder="e.g. ON-123456" />

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            // TODO: validate license for real later
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </Pressable>

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
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 16 },

  label: { marginTop: 12, marginBottom: 6, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 },

  primaryBtn: { backgroundColor: "#222", padding: 14, borderRadius: 10, marginTop: 18, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  backBtn: { marginTop: 14, alignItems: "center" },
  backText: { color: "#666" },
});
