import React from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

export default function Login() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Physio{"\n"}Companion</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="example@mcmaster.ca" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="********" secureTextEntry />

        <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.primaryBtnText}>Login</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>No Account?</Text>
        <Text style={styles.smallText}>
          If you’ve been given an invite from your physiotherapist, create an account:
        </Text>

        <Link href="/(auth)/create-patient" asChild>
          <Pressable style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Create Patient Account</Text>
          </Pressable>
        </Link>

        <Text style={[styles.smallText, { marginTop: 14 }]}>
          If you are a physiotherapist looking to assist patients:
        </Text>

        <Link href="/(auth)/create-physio" asChild>
          <Pressable style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Create Physio Account</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 22, justifyContent: "center" },
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 26 },

  label: { fontSize: 14, color: "#333", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 },

  primaryBtn: { backgroundColor: "#222", padding: 14, borderRadius: 10, marginTop: 18, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 22 },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  smallText: { color: "#666" },

  secondaryBtn: { backgroundColor: "#222", padding: 12, borderRadius: 10, marginTop: 12, alignItems: "center" },
  secondaryBtnText: { color: "#fff", fontWeight: "600" },
});
