import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  RECOMMENDED_EXERCISES,
  SIMILAR_EXERCISES,
  Exercise,
  getExercisesById,
} from "../../lib/exerciseData";
import { UserData } from "@/lib/useraccount";
import { getCurrentUser } from "@/lib/temp";

function ExerciseCard({
  item,
  onPress,
}: {
  item: Exercise;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card]}
    >
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
  const [userExercises, setUserExercises] = useState<Exercise[]>([]);

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
    if (!userData?.uid) return;
    (async () => {
      const exercises = await getExercisesById(userData.uid);
      setUserExercises(exercises || []);
    })();
  }, [userData?.uid]);

  if (userExercises.length !== 0) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Exercises</Text>
      <Text style={styles.pageSub}>Your available exercises are shown below.</Text>
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
      <Text style={styles.pageTitle}>Exercises</Text>
      <Text style={styles.pageSub}>Your physiotherapist hasn't assigned any exercises yet. {"\n\n"}
        Check back later!
      </Text>
    </ScrollView>
  );
} 

}

const styles = StyleSheet.create({
  container: { padding: 18, paddingTop: 24 },
  pageTitle: { fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: 24 },
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
    backgroundColor: "#fff",
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
});
