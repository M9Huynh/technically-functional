import React from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function InviteCode() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Invite Code</Text>
        <Text style={styles.text}>Enter the code provided by your physiotherapist.</Text>

        <TextInput style={styles.input} placeholder="ABC123" />

        <Pressable style={styles.btn} onPress={() => router.replace("/(tabs)" as any)}>
          <Text style={styles.btnText}>Finish</Text>
        </Pressable>

        <Pressable style={[styles.btn, { marginTop: 10 }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  text: { textAlign: "center", color: "#666", marginBottom: 14 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 },
  btn: { backgroundColor: "#222", padding: 12, borderRadius: 10, marginTop: 20, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
