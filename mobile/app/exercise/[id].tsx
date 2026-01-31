import React, { useMemo } from "react";
import { useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RECOMMENDED_EXERCISES, SIMILAR_EXERCISES } from "../../lib/exerciseData";

import { VideoView, useVideoPlayer } from "expo-video";

export default function ExerciseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const exercise = useMemo(() => {
    const all = [...RECOMMENDED_EXERCISES, ...SIMILAR_EXERCISES];
    return all.find((x) => x.id === id);
  }, [id]);

  // Only load a real video for single-leg-raises for now
  const videoSource =
    id === "single-leg-raises"
      ? require("../../assets/videos/single-leg-raises.mp4")
      : null;

  const player = useVideoPlayer(videoSource ?? undefined, (p) => {
    // runs when player is created
    p.loop = true;
    // you can uncomment this if you want it to auto-play:
    // p.play();
  });

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercise not found</Text>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const goToRecord = () => {
    router.push({
      pathname: "/(tabs)/record",
      params: { exerciseId: exercise.id, exerciseName: exercise.title },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{exercise.title}</Text>
      {!!exercise.subtitle && <Text style={styles.subtitle}>{exercise.subtitle}</Text>}

      {/* VIDEO (only for single-leg-raises for now) */}
      {id === "single-leg-raises" && (
        <View style={styles.videoWrap}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls
            contentFit="contain"
          />
        </View>
      )}

      {/* Demo box
      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>Demo</Text>
        <Text style={styles.demoText}>
          {exercise.demoText || "Demo: coming soon"}
        </Text>
      </View> */}

      {/* Description */}
      <View style={styles.descBox}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descText}>{exercise.description}</Text>
      </View>

      {/* Record button */}
      <Pressable style={styles.primaryBtn} onPress={goToRecord}>
        <Text style={styles.primaryBtnText}>Record</Text>
      </Pressable>

      {/* Back */}
      <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
        <Text style={styles.secondaryBtnText}>Back</Text>
      </Pressable>

      {!exercise.enabled && (
        <Text style={styles.note}>This is a placeholder and not enabled yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#666", marginTop: 6, marginBottom: 14 },

  videoWrap: {
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
  },

  demoBox: {
    borderRadius: 16,
    backgroundColor: "#f4f4f4",
    padding: 14,
    marginTop: 14,
  },
  demoTitle: { fontWeight: "900", marginBottom: 8 },
  demoText: { color: "#444" },

  descBox: {
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    marginTop: 14,
  },
  sectionTitle: { fontWeight: "900", marginBottom: 8 },
  descText: { color: "#444", lineHeight: 20 },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: "#eee",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#222", fontWeight: "800" },

  note: { marginTop: 16, textAlign: "center", color: "#999" },
});
