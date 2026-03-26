import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { UserAccountService, UserData } from "../../lib/useraccount";
import {
  getCurrentUser,
  getSelectedUser,
  clearSelectedUserID,
  getName,
  getEmail,
} from "../../lib/profileActivity";
import { clearUserRole, getUserRole, UserRole } from "@/lib/roleStore";
import { useFocusEffect } from "@react-navigation/native";
import { logout } from "@/lib/authService";
import { useRouter } from "expo-router";
import { format } from "date-fns";

export default function Profile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [role, setRole] = useState<UserRole>("patient");
  const [roleReady, setRoleReady] = useState<boolean>(false);
  const uas = new UserAccountService();
  const router = useRouter();
  const [physioName, setPhysioName] = useState("");
  const [physioEmail, setPhysioEmail] = useState("");

  useEffect(() => {
    (async () => {
      const r = await getUserRole();
      if (r) setRole(r);
      setRoleReady(true);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!roleReady) return;
      (async () => {
        if (role === "patient") {
          setUserData(await getCurrentUser());
          if (userData?.physioId) {
            setPhysioName(await getName(userData?.physioId));
            setPhysioEmail(await getEmail(userData?.physioId));
          }
        } else setUserData(await getSelectedUser());
      })();
    }, [role, roleReady, userData]),
  );

  if (role === "physio" && !userData) {
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
        <Text style={styles.text}>
          Please select a patient on the Home page to begin.
        </Text>
      </View>
    );
  } else {
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
        <Text style={styles.title}>{userData?.name || ""}'s Profile</Text>
        <Text style={styles.subtitle}>E-Mail</Text>
        <Text style={styles.text}>
          {userData?.email || "No email available"}
        </Text>
        <Text style={styles.subtitle}>Birthday</Text>
        <Text style={styles.text}>
          {new Date(userData?.birthday + "T12:00:00" || 0).toLocaleDateString(
            undefined,
            { weekday: "long", year: "numeric", month: "long", day: "numeric" },
          ) || "No birthday available"}
        </Text>
        {role === "patient" ? (
          <View>
            <Text style={styles.subtitle}>Linked Physiotherapist</Text>
            <Text style={styles.text}>{physioName || "Unavailable"}</Text>
            <Text style={styles.subtitle}>Linked Physiotherapist Email</Text>
            <Text style={styles.text}>
              {physioEmail || "No email available"}
            </Text>
          </View>
        ) : (
          ""
        )}

        <Text style={styles.subtitle}>Account Creation Date</Text>
        <Text style={styles.text}>
          {userData?.createdAt
            ? format(userData.createdAt.toDate(), "MMMM do, yyyy")
            : "No date available"}
        </Text>
        {role === "physio" && userData?.uid && (
          <Pressable
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert(
                "Confirm Delete",
                `Delete patient ${userData?.name || "this patient"}? This cannot be undone.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        const ok = await uas.deleteUserById(userData.uid!);
                        if (ok) {
                          await clearSelectedUserID();
                          setUserData(null);
                          Alert.alert("Deleted", "Patient account deleted.");
                        } else {
                          Alert.alert("Error", "Failed to delete patient.");
                        }
                      } catch (e) {
                        Alert.alert("Error", "Failed to delete patient.");
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Text style={styles.deleteBtnText}>Delete Patient</Text>
          </Pressable>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18, paddingTop: 60 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { fontSize: 34, fontWeight: "800" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    justifyContent: "center",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  text: { color: "#666", fontSize: 16, textAlign: "center" },
  deleteBtn: {
    marginTop: 24,
    alignSelf: "center",
    backgroundColor: "#ff4d4f",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutText: { fontSize: 12, fontWeight: "700", color: "#333" },
});
