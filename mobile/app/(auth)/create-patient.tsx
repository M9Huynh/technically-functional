import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

export default function CreatePatient() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Patient Account</Text>
        <Text style={styles.text}>Form later. Next: invite code.</Text>

        <Link href="/(auth)/invite-code" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </Link>

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
  text: { textAlign: "center", color: "#666" },
  btn: { backgroundColor: "#222", padding: 12, borderRadius: 10, marginTop: 20, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
