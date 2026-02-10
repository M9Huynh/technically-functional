import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { UserAccountService, UserData } from "../../lib/useraccount";
import { getCurrentUser, getSelectedUser, clearSelectedUserID } from "../../lib/profileActivity";
import { getUserRole, UserRole } from "@/lib/roleStore";
import { useFocusEffect } from "@react-navigation/native";

export default function Profile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [role, setRole] = useState<UserRole>("patient");
  const [roleReady, setRoleReady] = useState<boolean>(false);
  const uas = new UserAccountService();
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
        if (role === "patient") setUserData(await getCurrentUser());
        else setUserData(await getSelectedUser());
      })();
    }, [role, roleReady]),
  );

  if (role === "physio" && !userData) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>Physio{"\n"}Companion</Text>
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
});
