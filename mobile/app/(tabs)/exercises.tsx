import React from "react";
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { RECOMMENDED_EXERCISES, SIMILAR_EXERCISES, Exercise } from "../../lib/exerciseData";

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
      style={[styles.card, !item.enabled && styles.cardDisabled]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {!!item.subtitle && <Text style={styles.cardSubtitle}>{item.subtitle}</Text>}
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>

      <Text style={[styles.cardArrow, !item.enabled && styles.disabledText]}>
        {item.enabled ? "›" : "🔒"}
      </Text>
    </Pressable>
  );
}

export default function ExercisesTab() {
  const router = useRouter();

  const openExercise = (ex: Exercise) => {
    if (!ex.enabled) {
      Alert.alert("Coming soon", "This exercise is a placeholder for the demo.");
      return;
    }
    router.push({
      pathname: "/(tabs)/exercise/[id]",
      params: { id: ex.id },
    });
    // goes to mobile/app/(tabs)/exercise/[id].tsx
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Exercises</Text>
      <Text style={styles.pageSub}>Your recommended plan for today</Text>

      {/* Recommended section */}
      <Text style={styles.sectionTitle}>Recommended</Text>
      <View style={styles.sectionBox}>
        {RECOMMENDED_EXERCISES.map((ex) => (
          <ExerciseCard key={ex.id} item={ex} onPress={() => openExercise(ex)} />
        ))}
      </View>

      {/* Similar exercises section */}
      <Text style={styles.sectionTitle}>Similar exercises</Text>
      <View style={styles.sectionBox}>
        {SIMILAR_EXERCISES.map((ex) => (
          <ExerciseCard key={ex.id} item={ex} onPress={() => openExercise(ex)} />
        ))}
      </View>

      {/* Link to all exercises */}
      <Pressable
        style={styles.linkBtn}
        onPress={() => Alert.alert("Demo note", "All exercises page coming soon.")}
      >
        <Text style={styles.linkText}>See all exercises →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingTop: 24 },
  pageTitle: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  pageSub: { marginTop: 6, color: "#666", textAlign: "center", marginBottom: 18 },

  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 14, marginBottom: 10 },
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
