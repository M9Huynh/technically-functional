import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { logout } from "../../lib/authService";
import { getUserRole, clearUserRole, UserRole } from "../../lib/roleStore";
import {
  getCurrentUser,
  getSelectedUserID,
  setSelectedUserID,
} from "../../lib/profileActivity";
import userAccount, { UserData } from "@/lib/useraccount";
import { getUserActivities, getUserSummary } from "../../lib/profileActivity";
import { UserAccountService } from "@/lib/useraccount";

export default function Home() {
  const router = useRouter();
  const uas = new UserAccountService();

  const [role, setRole] = useState<UserRole>("patient"); // default is fine
  const [roleReady, setRoleReady] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [patients, setPatients] = useState<UserData[]>([]);
  const [selectedPatient, setStateSelectedPatient] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const savedRole = await getUserRole();
      if (savedRole) setRole(savedRole);

      const currentUser = await getCurrentUser();
      setUserData(currentUser);

      const sum = currentUser ? await getUserSummary(currentUser.uid) : null;
      setSummary(sum);

      setRoleReady(true);
    })();
  }, [refreshKey]);

  useEffect(() => {
    if (role !== "physio" || !userData?.uid) return;

    (async () => {
      setPatients(await uas.getPatientsByPhysio(userData.uid));
    })();
  }, [roleReady, role, userData?.uid, refreshKey]);

  useEffect(() => {
    if (!userData?.uid) return;

    (async () => {
      if (role === "patient")
        setActivities(await getUserActivities(userData.uid));
      else if (selectedPatient) {
        setActivities(await getUserActivities(selectedPatient));
      }
    })();
  }, [role, userData?.uid, selectedPatient, refreshKey]);

  useEffect(() => {
    if (role !== "patient" || !userData?.uid) return;

    (async () => {
      setSummary(await getUserSummary(userData.uid));
    })();
  }, [role, userData?.uid, refreshKey]);

  if (!roleReady) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.logo}>Physio{"\n"}Companion</Text>

        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            await clearUserRole();
            router.replace("/(auth)/role-select");
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <Text style={styles.welcome}>Welcome, {userData?.name}!</Text>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {role === "patient" ? "Your Stats" : "Linked Patients"}
          </Text>
          {role === "patient" ? (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {summary?.totalActivities || 0}
                </Text>
                <Text style={styles.statLbl}>Completed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {summary?.totalComments || 0}
                </Text>
                <Text style={styles.statLbl}>Comments</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{summary?.streak || 0}</Text>
                <Text style={styles.statLbl}>Streak</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{summary?.today || 0}</Text>
                <Text style={styles.statLbl}>Today</Text>
              </View>
            </View>
          ) : (
            patients.map((patient) => {
              const isSelected = patient.uid === selectedPatient;

              return (
                <Pressable
                  key={patient.uid}
                  onPress={() => {
                    setSelectedUserID(patient.uid); // persistent storage
                    setStateSelectedPatient(patient.uid); // UI state
                  }}
                  style={[
                    styles.historyItem,
                    isSelected && styles.selectedItem,
                  ]}
                >
                  <Text
                    style={[
                      styles.patientName,
                      isSelected && styles.selectedText,
                    ]}
                  >
                    {patient.name}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {role === "patient"
              ? "Activity History"
              : "Patient Activity History"}
          </Text>
          {activities.map((activity, index) => (
            <View key={index} style={styles.historyItem}>
              <Text>📅 {activity.date_performed || "N/A"}</Text>
              <Text>{activity.exercise || "Exercise"}</Text>
            </View>
          ))}
        </View>
      </View>

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
      <Pressable
        style={styles.refreshBtn}
        onPress={() => setRefreshKey((k) => k + 1)}
      >
        <Text style={styles.refreshText}>🔄 Refresh</Text>
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
  card: { flex: 1, borderRadius: 14, backgroundColor: "#f4f4f4", padding: 5 },
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
  refreshBtn: {
    alignSelf: "center",
    marginTop: 14,
    backgroundColor: "#eaeaea",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },

  refreshText: {
    fontWeight: "700",
    color: "#333",
  },
  selectedItem: {
    backgroundColor: "#222",
    borderWidth: 2,
    borderColor: "#000",
  },

  patientName: {
    fontWeight: "600",
    color: "#333",
  },

  selectedText: {
    color: "#fff",
    fontWeight: "800",
  },
});
