import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  // TODO later: pull real role from auth state
  const role: "patient" | "physio" = "patient";

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Physio{"\n"}Companion</Text>

      <Text style={styles.welcome}>Welcome, User!</Text>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {role === "patient" ? "Your Stats" : "Overall Stats"}
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}><Text style={styles.statNum}>4</Text><Text style={styles.statLbl}>Completed</Text></View>
            <View style={styles.statBox}><Text style={styles.statNum}>2</Text><Text style={styles.statLbl}>Comments</Text></View>
            <View style={styles.statBox}><Text style={styles.statNum}>3</Text><Text style={styles.statLbl}>Streak</Text></View>
            <View style={styles.statBox}><Text style={styles.statNum}>1</Text><Text style={styles.statLbl}>Today</Text></View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {role === "patient" ? "Activity History" : "Patient Activity History"}
          </Text>

          <View style={styles.historyItem}><Text>📅 Date</Text><Text>Exercise</Text></View>
          <View style={styles.historyItem}><Text>📅 Date</Text><Text>Exercise</Text></View>
          <View style={styles.historyItem}><Text>📅 Date</Text><Text>Exercise</Text></View>
          <View style={styles.historyItem}><Text>📅 Date</Text><Text>Exercise</Text></View>
        </View>
      </View>

      <Pressable
        style={styles.bigBtn}
        onPress={() => {
          if (role === "patient") router.push("/(tabs)/record");
          else router.push("/(tabs)/profile"); // or later: patient list / edit patient screen
        }}
      >
        <Text style={styles.bigBtnText}>
          {role === "patient" ? "Record Exercise" : "Edit Patient"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18, paddingTop: 60 },
  logo: { fontSize: 34, fontWeight: "800" },
  welcome: { textAlign: "center", marginTop: 10, fontSize: 18, color: "#444" },

  row: { flexDirection: "row", gap: 12, marginTop: 18 },
  card: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#f4f4f4",
    padding: 12,
  },
  cardTitle: { fontWeight: "800", marginBottom: 10 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLbl: { fontSize: 12, color: "#666" },

  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },

  bigBtn: {
    alignSelf: "center",
    marginTop: 18,
    backgroundColor: "#222",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 18,
  },
  bigBtnText: { color: "#fff", fontWeight: "800" },
});
