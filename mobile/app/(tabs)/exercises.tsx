import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Exercise,
  getExercisesById,
  getGeneralExercises,
  getSelectedExercises,
  addUserExercise,
  removeUserExercise,
  updateUserExercise,
} from "../../lib/exerciseData";
import { UserData } from "@/lib/useraccount";
import { getCurrentUser } from "@/lib/temp";
import { getUserRole, UserRole } from "@/lib/roleStore";
import { getSelectedUserID } from "@/lib/profileActivity";
import { useFocusEffect } from "@react-navigation/native";

function ExerciseCard({
  item,
  onPress,
}: {
  item: Exercise;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.card]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {!!item.subtitle && (
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        )}
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ExercisesTab() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userExercises, setUserExercises] = useState<Exercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<String[]>([]);
  const [physioExercises, setPhysioExercises] = useState<Exercise[]>([]);
  const [roleReady, setRoleReady] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalText, setModalText] = useState("");
  const [modalSets, setModalSets] = useState("");
  const [modalReps, setModalReps] = useState("");
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  const openExercise = (ex: Exercise) => {
    router.push({
      pathname: "/exercise/[id]",
      params: { id: ex.id },
    } as any);
    // goes to mobile/app/(tabs)/exercise/[id].tsx
  };

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      setUserData(currentUser);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const r = await getUserRole();
      setUserRole(r);
      setRoleReady(true);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!roleReady) return;
      (async () => {
        if (userRole === "physio") {
          // fetch the currently selected patient id and then use that
          // value directly when loading exercises. previously we used
          // `selectedUser` state which hadn't been updated yet, so the
          // first call always passed an empty string and `selectedIds`
          // ended up empty until a hot reload triggered the effect again.
          const su = await getSelectedUserID();
          setSelectedUser(su);
          if (su) {
            const sue = await getSelectedExercises(su);
            if (sue) setSelectedIds(sue.map((ex) => ex.title));
            else setSelectedIds([]);
          }
        }
      })();
    }, [roleReady, userRole])
  );

  useEffect(() => {
    if (!userData?.uid) return;
    (async () => {
      if (userRole === "physio") {
        const physioExs = await getGeneralExercises();
        setPhysioExercises(physioExs || []);
      } else if (userRole === "patient") {
        const exercises = await getExercisesById(userData.uid);
        setUserExercises(exercises || []);
      }
    })();
  }, [userData?.uid, selectedUser, userRole]);

  // whenever the selected user id changes we should refresh the list of
  // selected exercise titles so the checkboxes reflect the database state
  useEffect(() => {
    if (userRole === "physio" && selectedUser) {
      (async () => {
        const sue = await getSelectedExercises(selectedUser);
        if (sue) setSelectedIds(sue.map((ex) => ex.title));
        else setSelectedIds([]);
      })();
    }
  }, [userRole, selectedUser]);

  const toggleSelection = (ex: Exercise) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const id = ex.title;
      const index = next.indexOf(id);
      if (index !== -1) {
        next.splice(index, 1);
        onUnchecked(id);
      } else {
        next.push(id);
        onChecked(ex);
      }
      return next;
    });
  };

  const onChecked = (ex: Exercise) => {
    // placeholder action when a physio selects an exercise for a user
    console.log("Selected exercise", ex.title, "for user", selectedUser);
    addUserExercise(selectedUser || "", ex);
  };

  const onUnchecked = (id: string) => {
    // placeholder action when a physio deselects an exercise
    console.log("Deselected exercise", id, "for user", selectedUser);
    removeUserExercise(selectedUser || "", id);
  };

  const modifyInstructions = async (ex: Exercise) => {
    // open modal and preload text. if the exercise has already been
    // assigned to the patient we want to show the customized description
    // stored in the userExercises collection rather than the generic text
    // from the general library.
    setModalExercise(ex);

    if (selectedUser) {
      const assigned = await getSelectedExercises(selectedUser);
      const match = assigned?.find((u) => u.title === ex.title);
      setModalText(match?.description ?? ex.description);
      setModalSets(match?.sets ?? ex.sets ?? "");
      setModalReps(match?.reps ?? ex.reps ?? "");
    } else {
      setModalText(ex.description);
      setModalSets(ex.sets ?? "");
      setModalReps(ex.reps ?? "");
    }

    setModalVisible(true);
  };

  const updateInstructions = (ex: Exercise, newDesc: string, newSets: string, newReps: string) => {
    // placeholder for updating instructions in database
    console.log("Updated instructions for exercise", ex.title, ":", newDesc);
    updateUserExercise(selectedUser || "", ex.title, newDesc, newSets, newReps);
  };

  // if we haven't determined the role yet, avoid rendering anything
  if (userRole === null) {
    return null;
  }

  // Role-based rendering
  if (userRole === "physio") {
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
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.logo}>Physio{"\n"}Companion</Text>
          </View>
          <Text style={styles.pageTitle}>Exercises</Text>
          <Text style={styles.pageSub}>
            Select which exercises are available for the selected patient and modify instructions as
            needed.
          </Text>
          <View style={styles.sectionBox}>
            {physioExercises.map((ex) => {
              const checked = selectedIds.includes(ex.title);
              return (
                <View key={ex.title} style={styles.physioRow}>
                  <Pressable onPress={() => toggleSelection(ex)}>
                    <Text style={styles.checkbox}>{checked ? "☑" : "☐"}</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{ex.title}</Text>
                    {!!ex.description && (
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {ex.description}
                      </Text>
                    )}
                  </View>
                  {checked && (
                    <Pressable
                      style={styles.modifyBtn}
                      onPress={() => modifyInstructions(ex)}
                    >
                      <Text style={styles.modifyText}>Modify instructions</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.overlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Modify instructions</Text>
              <TextInput
                style={styles.modalInput}
                multiline
                value={modalText}
                onChangeText={setModalText}
                placeholder="Enter description"
              />
              <View style={styles.modalRow}>
                <View style={styles.modalHalfRow}>
                  <Text style={styles.setRepText}>Sets:</Text>
                  <TextInput
                    style={styles.setRepInput}
                    value={modalSets}
                    onChangeText={setModalSets}
                    placeholder="##"
                  />
                </View>
                <View style={styles.modalHalfRow}>
                  <Text style={styles.setRepText}>Reps:</Text>
                  <TextInput
                    style={styles.setRepInput}
                    value={modalReps}
                    onChangeText={setModalReps}
                    placeholder="##"
                  />
                </View>
              </View>
              <View style={styles.modalButtonRow}>
                <Pressable
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalSave]}
                  onPress={() => {
                    if (modalExercise) {
                      updateInstructions(modalExercise, modalText, modalSets, modalReps);
                    }
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        </ScrollView>
      );
    }
  }

  // default patient view
  if (userExercises.length !== 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
            <Text style={styles.logo}>Physio{"\n"}Companion</Text>
          </View>
        <Text style={styles.pageTitle}>Exercises</Text>
        <Text style={styles.pageSub}>
          Your available exercises are shown below. {"\n"}
          Select an exercise to view more details.
        </Text>
        <View style={styles.sectionBox}>
          {userExercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              item={ex}
              onPress={() => openExercise(ex)}
            />
          ))}
        </View>
      </ScrollView>
    );
  } else {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
            <Text style={styles.logo}>Physio{"\n"}Companion</Text>
          </View>
        <Text style={styles.pageTitle}>Exercises</Text>
        <Text style={styles.pageSub}>
          Your physiotherapist hasn't assigned any exercises yet. {"\n\n"}
          Check back later!
        </Text>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18, paddingTop: 60, },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 24,
  },
  pageSub: {
    marginTop: 6,
    color: "#666",
    textAlign: "center",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 10,
  },
  sectionBox: { gap: 10 },
  card: {
    backgroundColor: "#dddddd",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDisabled: { opacity: 0.6 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardSubtitle: { marginTop: 2, color: "#444", fontWeight: "700" },
  cardDesc: { marginTop: 6, color: "#666" },
  cardArrow: { fontSize: 22, fontWeight: "800", marginLeft: 10 },

  disabledText: { color: "#999" },

  linkBtn: { marginTop: 18, alignSelf: "center" },
  linkText: { color: "#222", fontWeight: "800" },

  physioRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    backgroundColor: "#dddddd",
    borderRadius: 10,
  },
  checkbox: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  modifyBtn: {
    marginLeft: "auto",
    backgroundColor: "#222",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modifyText: {
    color: "#fff",
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { fontSize: 34, fontWeight: "800" },
  text: {
    color: "#666",
    textAlign: "center",
    justifyContent: "center",
    fontSize: 16,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    width: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancel: {
    backgroundColor: "#bbb",
  },
  modalSave: {
    backgroundColor: "#222",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  modalRow: {
    flexDirection: "row",
  },
  modalHalfRow: {
    flexDirection: "row",
    width: "47%",
  },
  setRepInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    minHeight: 16,
    textAlignVertical: "top",
    flex: 1,
    marginHorizontal: 14
  },
  setRepText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    marginTop: "auto",
  },
});
