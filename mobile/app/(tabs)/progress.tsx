import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-gifted-charts";
import {
  exerciseChartData,
  getCurrentUserID,
  getSelectedUserID,
  repsChartData,
  updateActivityWithUserEntry,
  painChartData,
  effortChartData,
  satisfactionChartData,
} from "../../lib/profileActivity";
import { getCurrentUser } from "@/lib/profileActivity";
import { getUserRole, UserRole } from "@/lib/roleStore";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Progress() {
  const router = useRouter();
  const [repsData, setRepsData] = useState<{ label: string; value: number }[]>(
    [],
  );
  const [exerciseData, setExerciseData] = useState<
    { label: string; value: number }[]
  >([]);
  const [painData, setPainData] = useState<
    { label: string; value: number }[]
  >([]);
  const [effData, setEffData] = useState<
    { label: string; value: number }[]
  >([]);
  const [satData, setSatData] = useState<
    { label: string; value: number }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("patient");
  const [roleReady, setRoleReady] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const { exerciseId, showSurvey } = useLocalSearchParams();
  const [painNum, setPainNum] = useState(5);
  const [effNum, setEffNum] = useState(5);
  const [satNum, setSatNum] = useState(5);
  const [selectedGraph, setSelectedGraph] = useState("acts");
  const [graphTitle, setGraphTitle] = useState("");
  const [graphData, setGraphData] = useState<
    { label: string; value: number }[]
  >([]);
  const [graphHelper, setGraphHelper] = useState("");

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

      const painDataResult = await painChartData(selectedUser);
      setPainData(
        painDataResult.map((d) => ({
          label: String(d.label),
          value: d.value,
        })),
      );

      const effDataResult = await effortChartData(selectedUser);
      setEffData(
        effDataResult.map((d) => ({
          label: String(d.label),
          value: d.value,
        })),
      );

      const satDataResult = await satisfactionChartData(selectedUser);
      setSatData(
        satDataResult.map((d) => ({
          label: String(d.label),
          value: d.value,
        })),
      );

      console.log("exerciseData", exerciseData);
      console.log("repsData", repsData);
    })();
  }, [selectedUser]);

  useEffect(() => {
    if (showSurvey === "true") {
      setPainNum(5);
      setEffNum(5);
      setSatNum(5);
      setModalVisible(true);
      router.setParams({ showSurvey: "false"});
    }
  }, [showSurvey]);

  useEffect(() => {
    if (!selectedUser) return;

    switch (selectedGraph) {
      case 'reps':
        setGraphTitle("Repetitions This Week");
        setGraphData(repsData);
        setGraphHelper("This graph shows the total number of completed repetitions per day over the last week from all exercises. Aim for a slow increase over time; more repetitions means more strength!");
        break;
      case 'acts':
        setGraphTitle("Activities This Week");
        setGraphData(exerciseData);
        setGraphHelper("This graph shows the total number of activities you recorded per day over the last week. Aim to keep this level; consistent exercising means consistent healing!");
        break;
      case 'pain':
        setGraphTitle("Discomfort Levels This Week");
        setGraphData(painData);
        setGraphHelper("This graph shows your average discomfort levels per day over the last week. Lower numbers indicate less pain during exercises, ideally this decreases with time!");
        break;
      case 'eff':
        setGraphTitle("Effort Levels This Week");
        setGraphData(effData);
        setGraphHelper("This graph shows your average effort levels per day over the last week. Higher numbers indicate the activity felt more strenuous; consult your physio for ideal target!");
        break;
      case 'sat':
        setGraphTitle("Satisfaction Levels This Week");
        setGraphData(satData);
        setGraphHelper("This graph shows your average satisfaction with your activities over the last week. Higher numbers means you were more satisfied with your performance!");
        break;
    }
  }, [selectedGraph, repsData, exerciseData, painData, effData, satData])

  //const repsData = [{ label: '2024-06-01', value: 10 },{ label: '2024-06-02', value: 15 },]
  if (!selectedUser) {
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
        {role === "patient" ? (
          <Text style={styles.superTitle}>Your Progress</Text>
        ) : (
          <Text style={styles.superTitle}>Patient Progress</Text>
        )}
        <Text style={styles.title}>{graphTitle}</Text>
        <View style={styles.chart}>
          <BarChart
            frontColor={"#177AD5"}
            data={graphData}
            width={350}
            height={250}
            barWidth={30}
            spacing={15}
            roundedTop
            yAxisTextStyle={{ fontSize: 10, color: "#666" }}
            noOfSections={2}
            maxValue={selectedGraph === "acts" || selectedGraph === "reps" ? Math.ceil(Math.max(...graphData.map((d) => d.value)) * 1.1) : 10}
          />
        </View>
        <Text style={styles.text}>{graphHelper}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.modalButton, selectedGraph === "acts" ? styles.modalSave : styles.modalCancel]} onPress={() => {setSelectedGraph("acts");}}><Text style={styles.modalBtnText}>Activities</Text></Pressable>
          <Pressable style={[styles.modalButton, selectedGraph === "reps" ? styles.modalSave : styles.modalCancel]} onPress={() => {setSelectedGraph("reps");}}><Text style={styles.modalBtnText}>Repetitions</Text></Pressable>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.modalButton, selectedGraph === "pain" ? styles.modalSave : styles.modalCancel]} onPress={() => {setSelectedGraph("pain");}}><Text style={styles.modalBtnText}>Discomfort</Text></Pressable>
          <Pressable style={[styles.modalButton, selectedGraph === "eff" ? styles.modalSave : styles.modalCancel]} onPress={() => {setSelectedGraph("eff");}}><Text style={styles.modalBtnText}>Effort</Text></Pressable>
          <Pressable style={[styles.modalButton, selectedGraph === "sat" ? styles.modalSave : styles.modalCancel]} onPress={() => {setSelectedGraph("sat");}}><Text style={styles.modalBtnText}>Satisfaction</Text></Pressable>
        </View>

        <Modal visible={modalVisible} style={styles.modal}>
          <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
            <View style={styles.modalRow}>
              <Text style={styles.modalTitle}>Post-Activity Survey</Text>
              <Text style={styles.modalSubtitle}>Pain</Text>
              <Text>How uncomfortable was that exercise to perform?</Text>
              <Text style={styles.valueText}>{painNum}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={5}
                onValueChange={(value) => setPainNum(value)}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalSubtitle}>Effort</Text>
              <Text>How strenuous was that exercise to perform?</Text>
              <Text style={styles.valueText}>{effNum}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={5}
                onValueChange={(value) => setEffNum(value)}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalSubtitle}>Satisfaction</Text>
              <Text>
                How satisfied do you feel with your exercise performance?
              </Text>
              <Text style={styles.valueText}>{satNum}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={5}
                onValueChange={(value) => setSatNum(value)}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalSave]}
                onPress={() => {
                  if (typeof exerciseId === 'string') {
                    setModalVisible(false);
                    console.log(exerciseId);
                    updateActivityWithUserEntry(exerciseId, painNum, effNum, satNum);
                  }
                }}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  text: {
    color: "#666",
    textAlign: "center",
    justifyContent: "center",
    fontSize: 16,
  },
  modal: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  slider: {
    width: "90%",
    height: 40,
  },
  modalRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    justifyContent: "center",
    fontSize: 32,
    fontWeight: 700,
  },
  modalSubtitle: {
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 500,
  },
  valueText: {
    fontSize: 20,
    fontWeight: 400,
  },
  modalButtonRow: {
    alignItems: "flex-end",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSave: {
    backgroundColor: "#222",
  },
  modalCancel: {
    backgroundColor: "#bbb",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    margin: 12,
    justifyContent: "space-around",
  },
  normButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  }
});
