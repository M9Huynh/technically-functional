import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { logout } from "../../lib/authService";


export default function Home() {
  const router = useRouter();

  // Later you will get this from auth state
  const role: "patient" | "physio" = "patient";

  return (
    <View style={styles.container}>
      {/* HEADER (Logo + Logout) */}
      <View style={styles.headerRow}>
        <Text style={styles.logo}>Physio{"\n"}Companion</Text>

        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await logout(); //Firebase sign out
            router.replace("/(auth)/role-select"); // go back to role select
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

      </View>

      <Text style={styles.welcome}>Welcome, User!</Text>

      <View style={styles.row}>
        {/* STATS CARD */}
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

        {/* ACTIVITY CARD */}
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

      {/* MAIN ACTION BUTTON */}
      <Pressable
        style={styles.bigBtn}
        onPress={() => {
          if (role === "patient") router.push("/(tabs)/record");
          else router.push("/(tabs)/profile");
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  logo: { fontSize: 34, fontWeight: "800" },
  welcome: { textAlign: "center", marginTop: 10, fontSize: 18, color: "#444" },

  logoutBtn: {
    backgroundColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutText: { fontSize: 12, fontWeight: "700", color: "#333" },

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
