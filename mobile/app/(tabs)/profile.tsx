import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { UserData } from "../../lib/temp";
import { getCurrentUser } from "../../lib/temp";

export default function Profile() {

  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      setUserData(currentUser);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.logo}>Physio{"\n"}Companion</Text>
      </View>
      <Text style={styles.title}>{userData?.name || ""}'s Profile</Text>
      <Text style={styles.subtitle}>E-Mail</Text>
      <Text style={styles.text}>{userData?.email || "No email available"}</Text>
      <Text style={styles.subtitle}>Birthday</Text>
      <Text style={styles.text}>{new Date(userData?.birthday + "T12:00:00" || 0).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) || "No birthday available"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18, paddingTop: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { fontSize: 34, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10, justifyContent: "center", textAlign: "center" },
  subtitle: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 10 },
  text: { color: "#666", fontSize: 16},
});
