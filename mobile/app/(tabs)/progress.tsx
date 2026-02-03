import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { exerciseChartData, repsChartData } from "../../lib/profileActivity";
import { getCurrentUser } from "@/lib/temp";

export default function Progress() {
  const [repsData, setRepsData] = useState<{ label: string; value: number }[]>([]);
  const [exerciseData, setExerciseData] = useState<{ label: string; value: number }[]>([]);
  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      const repData = await repsChartData(currentUser?.uid || "");
      setRepsData(repData);
      const exerciseData = await exerciseChartData(currentUser?.uid || "");
      setExerciseData(exerciseData);
    })();
  }, []);

//const repsData = [{ label: '2024-06-01', value: 10 },{ label: '2024-06-02', value: 15 },]
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.logo}>Physio{"\n"}Companion</Text>
      </View>
      <Text style={styles.title}>Activities This Week</Text>
      <View style={styles.chart}>
      <BarChart 
        frontColor={'#177AD5'}
        data={exerciseData}
        width={350}
        height={150}
        barWidth={30}
        spacing={15}
        roundedTop
        yAxisTextStyle={{ fontSize: 10, color: '#666' }}
        noOfSections={2}
        maxValue={Math.max(...exerciseData.map(d => d.value)) + 1}
      />
      </View>
      <Text style={styles.title}>Reps This Week</Text>
      <View style={styles.chart}>
      <BarChart 
        frontColor={'#177AD5'}
        data={repsData}
        width={350}
        height={150}
        barWidth={30}
        spacing={15}
        roundedTop
        yAxisTextStyle={{ fontSize: 10, color: '#666' }}
        noOfSections={5}
        maxValue={Math.max(...repsData.map(d => d.value)) + 5}
      />
      </View>
      <Text style={styles.text}>More Coming Soon...</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    justifyContent: "center",
    textAlign: "center",
  },
  chart: { borderRadius: 20, marginBottom: 20, overflow: "hidden"},
  text: { color: "#666", textAlign: "center" },
});
