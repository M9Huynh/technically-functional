import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <Pressable style={styles.card} onPress={() => router.push("/(tabs)/exercises")}>
        <Text style={styles.cardTitle}>Exercises</Text>
        <Text style={styles.cardDesc}>Browse exercises, demos, instructions</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/(tabs)/record")}>
        <Text style={styles.cardTitle}>Record Exercise</Text>
        <Text style={styles.cardDesc}>Record yourself performing an exercise</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/(tabs)/progress")}>
        <Text style={styles.cardTitle}>Performance Stats</Text>
        <Text style={styles.cardDesc}>View your trends and past sessions</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/(tabs)/feedback")}>
        <Text style={styles.cardTitle}>Feedback / Survey</Text>
        <Text style={styles.cardDesc}>Submit feedback and short surveys</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/(tabs)/profile")}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.cardDesc}>Manage account info</Text>
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={() => router.replace("/(auth)/role-select")}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 18 },

  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  cardDesc: { color: "#666" },

  logoutBtn: { marginTop: 12, alignSelf: "center", backgroundColor: "#222", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  logoutText: { color: "#fff", fontWeight: "700" },
});
