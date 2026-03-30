import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Clipboard, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { logout } from "../../lib/authService";
import { getUserRole, clearUserRole, UserRole } from "../../lib/roleStore";
import {
  clearSelectedUserID,
  getCurrentUser,
  getPhysioInviteCode,
  getSelectedUserID,
  setSelectedUserID,
} from "../../lib/profileActivity";
import userAccount, { UserData } from "@/lib/useraccount";
import { getUserActivities, getUserSummary } from "../../lib/profileActivity";
import { UserAccountService } from "@/lib/useraccount";
import { format } from "date-fns";
// (removed reanimated ScrollView import)

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
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { refreshPatients } = useLocalSearchParams();

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
  }, []);

  useEffect(() => {
    if (role !== "physio" || !userData?.uid) return;

    (async () => {
      setPatients(await uas.getPatientsByPhysio(userData.uid));
      setInvite(await getPhysioInviteCode(userData.uid));
    })();
  }, [roleReady, role, userData?.uid, refreshPatients]);

  useEffect(() => {
    if (!userData?.uid) return;

    (async () => {
      if (role === "patient")
        setActivities(await getUserActivities(userData.uid));
      else if (selectedPatient) {
        setActivities(await getUserActivities(selectedPatient));
      }
    })();
  }, [role, userData?.uid, selectedPatient]);

  useEffect(() => {
    if (role !== "patient" || !userData?.uid) return;

    (async () => {
      setSummary(await getUserSummary(userData.uid));
    })();
  }, [role, userData?.uid]);

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
            await clearSelectedUserID();
            router.replace("/(auth)/role-select");
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <Text style={styles.welcome}>Welcome, {userData?.name}!</Text>

      <View style={styles.row}>
        <View style={styles.stat_card}>
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

        <ScrollView
          style={styles.ex_card}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 8 }}
          persistentScrollbar={true}
        >
          <Text style={styles.cardTitle}>
            {role === "patient"
              ? "Your Activity History"
              : "Patient Activity History"}
          </Text>
          {role === "physio" && selectedPatient === null ? <Text style={styles.pageSub}>Please select a patient to view their Activity history.</Text> : ""}
          {activities.length === 0 ? role === "patient" ? <Text style={styles.pageSub}>No Activities found, please record an Activity to see it listed here.</Text> : selectedPatient !== null ? <Text style={styles.pageSub}>No Activities found for selected patient.</Text> : "" : ""}
          {activities.map((activity, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.dateText}>📅 {format(new Date(activity.date_performed), "MMM. do")}</Text>
              <Text style={styles.dateText} numberOfLines={2} ellipsizeMode="tail">
                {activity.exercise || "Exercise"}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Pressable
        style={styles.bigBtn}
        onPress={() => {
          if (role === "patient") router.push("/(tabs)/exercises");
          //if (role === "patient") router.push({pathname:"/(tabs)/progress", params: {exerciseId: "0jjNkh5a2yQV1Fu2DAUm", showSurvey: "true"},});
          else router.push("/(tabs)/profile");
        }}
      >
        <Text style={styles.bigBtnText}>
          {role === "patient" ? "View Assigned Exercises" : "Edit Patient"}
        </Text>
      </Pressable>
      {role === "patient" ? 
      <Text style={styles.pageSub}>Find more information on your past Activities in the Feedback tab.</Text> : ""}
      {role === "physio" && invite && (
        <View style={styles.inviteContainer}>
          <Text style={styles.invite}>Invite Code: {invite}</Text>
          <Pressable
            style={styles.copyBtn}
            onPress={() => {
              Clipboard.setString(invite);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Text style={styles.copyBtnText}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
        </View>
      )}
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
  row: { flexDirection: "row", gap: 12, marginTop: 18, maxHeight: "60%" },
  stat_card: { width: "30%", borderRadius: 14, backgroundColor: "#dddddd", padding: 5, maxHeight: 325 },
  ex_card: { flex: 1, borderRadius: 14, backgroundColor: "#dddddd", padding: 5, maxHeight: "100%" },
  cardTitle: { fontWeight: "800", marginBottom: 10 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLbl: { fontSize: 12, color: "#666" },
  historyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  dateText: {
    flex: 1,
    width: 80,
    color: "#222",
  },
  exerciseText: {
    flex: 1,
    flexWrap: "wrap",
    marginLeft: 8,
    color: "#222",
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
  text: {
    color: "#666",
    textAlign: "center",
    justifyContent: "center",
    fontSize: 16,
    marginTop: 10,
  },
  inviteContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  invite: {
    textAlign: "center",
    fontSize: 18,
    color: "#444",
    fontWeight: "600",
    marginBottom: 10,
  },
  copyBtn: {
    backgroundColor: "#177AD5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  copyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  pageSub: {
    marginTop: 6,
    color: "#666",
    textAlign: "center",
    marginBottom: 18,
  },
});
