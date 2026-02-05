import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-gifted-charts";
import {
  exerciseChartData,
  getCurrentUserID,
  getSelectedUserID,
  repsChartData,
} from "../../lib/profileActivity";
import { getCurrentUser } from "@/lib/profileActivity";
import { getUserRole, UserRole } from "@/lib/roleStore";

export default function Progress() {
  const [repsData, setRepsData] = useState<{ label: string; value: number }[]>(
    [],
  );
  const [exerciseData, setExerciseData] = useState<
    { label: string; value: number }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("patient");
  const [roleReady, setRoleReady] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const savedRole = await getUserRole();
      if (savedRole) setRole(savedRole);
      setRoleReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!roleReady) return;
    (async () => {
      role === "physio"
        ? setSelectedUser(await getSelectedUserID())
        : setSelectedUser(await getCurrentUserID());
    })();
  }, [roleReady, role]);

  useFocusEffect(
    React.useCallback(() => {
      if (!roleReady) return;
      (async () => {
        role === "physio"
          ? setSelectedUser(await getSelectedUserID())
          : setSelectedUser(await getCurrentUserID());
      })();
    }, [roleReady, role]),
  );

  useEffect(() => {
    if (!selectedUser) return;

    (async () => {
      const repData = await repsChartData(selectedUser);
      setRepsData(
        repData.map((d) => ({
          label: String(d.label),
          value: d.value,
        })),
      );

      const exData = await exerciseChartData(selectedUser);
      setExerciseData(
        exData.map((d) => ({
          label: String(d.label),
          value: d.value,
        })),
      );
      console.log("exerciseData", exerciseData);
      console.log("repsData", repsData);
    })();
  }, [selectedUser]);

  //const repsData = [{ label: '2024-06-01', value: 10 },{ label: '2024-06-02', value: 15 },]
  if (!selectedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>Physio{"\n"}Companion</Text>
        </View>
        <Text style={styles.text}>Please select a patient on the Home page to begin.</Text>
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>Physio{"\n"}Companion</Text>
        </View>
        {role === "patient" ? (
          <Text style={styles.superTitle}>Your Progress</Text>
        ) : (
          <Text style={styles.superTitle}>Patient Progress</Text>
        )}
        <Text style={styles.title}>Activities This Week</Text>
        <View style={styles.chart}>
          <BarChart
            frontColor={"#177AD5"}
            data={exerciseData}
            width={350}
            height={150}
            barWidth={30}
            spacing={15}
            roundedTop
            yAxisTextStyle={{ fontSize: 10, color: "#666" }}
            noOfSections={2}
            maxValue={Math.max(...exerciseData.map((d) => d.value)) + 1}
          />
        </View>
        <Text style={styles.title}>Reps This Week</Text>
        <View style={styles.chart}>
          <BarChart
            frontColor={"#177AD5"}
            data={repsData}
            width={350}
            height={150}
            barWidth={30}
            spacing={15}
            roundedTop
            yAxisTextStyle={{ fontSize: 10, color: "#666" }}
            noOfSections={5}
            maxValue={Math.max(...repsData.map((d) => d.value)) + 5}
          />
        </View>
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
  superTitle: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
    justifyContent: "center",
    textAlign: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    justifyContent: "center",
    textAlign: "center",
  },
  chart: { borderRadius: 20, marginBottom: 20, overflow: "hidden" },
  text: { color: "#666", textAlign: "center", justifyContent: "center" , fontSize: 16 },
});
