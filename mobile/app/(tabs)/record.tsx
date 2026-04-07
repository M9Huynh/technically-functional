import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import FeedbackOverlay from "../../components/FeedbackOverlay";

import ScreenContainer from "@/components/screenContainer";
import PrimaryButton from "../../components/primaryButton";

import Svg, { Circle, Line } from "react-native-svg";

import {
  processFrame,
  resetBackend,
  Landmark,
  Connection,
  Side,
  Facing,
} from "../../lib/poseService";
import { saveMetrics } from "../../lib/metricsService";
import { getUserRole, UserRole } from "../../lib/roleStore";

export default function Record() {
  const router = useRouter();

  // Role guard hooks
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Camera hooks (MUST be before any return)
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Other hooks
  const [streaming, setStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [metrics, setMetrics] = useState<any>(null);

  // NEW: keep last good metrics so STOP still shows totals
  const [finalMetrics, setFinalMetrics] = useState<any>(null);

  const [side, setSide] = useState<Side | null>(null);
  const [facing, setFacing] = useState<Facing>("front");

  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  //NEW: busyRef prevents overlap (only 1 frame at a time)
  const busyRef = useRef(false);

  // Load role once
  useEffect(() => {
    const loadRole = async () => {
      const r = await getUserRole();
      setRole(r);
      setLoadingRole(false);
    };
    loadRole();
  }, []);

  // Ask for camera permission
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  //NEW/CHANGED: Streaming loop WITHOUT setInterval
  // We process the next frame only AFTER the previous finishes → less lag/backlog.
  useEffect(() => {
    let cancelled = false;

    //NEW: timeout helper so a slow backend frame doesn’t hang forever
    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), ms)
        ),
      ]);

    const tick = async () => {
      if (cancelled) return;

      // Not streaming / not ready → check again soon
      if (!streaming || !cameraRef.current || !side || busyRef.current) {
        setTimeout(tick, 300); //150 before
        return;
      }

      busyRef.current = true;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.12, // CHANGED: lower quality = faster (demo friendly)
          skipProcessing: true,
          exif: false, // NEW: less work per capture
        });

        if (!photo?.base64) return;

        const data: any = await withTimeout(
          processFrame(photo.base64, side, facing),
          2000
        );

        // CHANGED: update live + keep last good metrics
        if (data?.metrics) {
          setMetrics(data.metrics);

          // NEW: keep "best" final metrics so bad frames don't overwrite totals
          setFinalMetrics((prev: any) => {
            const next = data.metrics;
            if (!prev) return next;

            const prevReps = prev?.rep_count ?? 0;
            const nextReps = next?.rep_count ?? 0;

            // never replace higher reps with lower reps
            if (nextReps < prevReps) return prev;

            // don't overwrite with obvious bad zeros
            const looksBad =
              nextReps === 0 &&
              (next?.min_degree === 0 && next?.max_degree === 0);

            if (looksBad) return prev;

            return next;
          });
        }

        // CHANGED: only update overlay when landmarks are valid (prevents flicker)
        if (Array.isArray(data?.landmarks) && data.landmarks.length === 33) {
          setLandmarks(data.landmarks);
        }
        if (Array.isArray(data?.connections) && data.connections.length > 0) {
          setConnections(data.connections);
        }
      } catch (e) {
        console.log("Frame error:", e);
      } finally {
        busyRef.current = false;

        // NEW: schedule next frame AFTER finishing (no backlog)
        setTimeout(tick, 350);
      }
    };

    tick();

    return () => {
      cancelled = true;
      busyRef.current = false;
    };
  }, [streaming, side, facing]);

  // Now safe to return
  if (loadingRole) {
    return (
      <ScreenContainer>
        <Text style={styles.text}>Loading...</Text>
      </ScreenContainer>
    );
  }

  if (role === "physio") {
    return <Redirect href="/" />;
  }

  const handleToggleRecording = async () => {
    if (!side) {
      Alert.alert(
        "Choose a knee first",
        "Select Right or Left knee before recording."
      );
      return;
    }

    if (!streaming) {
      // START recording
      try {
        await resetBackend();
      } catch (e) {
        console.log("Reset failed:", e);
      }

      setMetrics(null);

      // NEW: clear finalMetrics for a fresh session
      setFinalMetrics(null);

      setLandmarks(null);
      setConnections([]);
    } else {
      // STOP recording
      // keep finalMetrics and show it in UI (displayMetrics below handles this)
      setMetrics((prev: any) => prev); // no-op, but keeps intent clear
    }

    setStreaming((s) => !s);
  };

  // CHANGED: Save uses finalMetrics when stopped, metrics when streaming
  const handleSaveMetrics = async () => {
    const m = streaming ? metrics : finalMetrics; // NEW
    if (!m || isSaving) return;

    try {
      setIsSaving(true);

      await saveMetrics({
        angle: m.angle || 0,
        rom_degree: m.rom_degree || 0,
        min_degree: m.min_degree || 0,
        max_degree: m.max_degree || 0,
        rep_count: m.rep_count || 0,
        rep_state: m.rep_state || "None",
        avg_rep_duration: m.avg_rep_duration || 0,
        current_rep_duration: m.current_rep_duration || 0,
        timestamp: Date.now(),
      });

      Alert.alert("Saved", "Metrics saved to Firebase");
      router.push("/progress");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save metrics");
    } finally {
      setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <ScreenContainer>
        <Text style={styles.text}>Checking camera permission...</Text>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <Text style={styles.text}>Camera permission required.</Text>
        <PrimaryButton label="Allow Camera" onPress={requestPermission} />
      </ScreenContainer>
    );
  }

  // NEW: when stopped, show finalMetrics; when streaming, show live metrics
  const displayMetrics = streaming ? metrics : finalMetrics;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cameraBox}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

          {/* Debug label: safe to remove later */}
          <Text style={{ position: "absolute", top: 5, left: 5, color: "white" }}>
            LM: {landmarks ? landmarks.length : 0}
          </Text>

          {landmarks && landmarks.length > 0 && (
            <Svg
              style={StyleSheet.absoluteFill}
              width="100%"
              height="100%"
              viewBox="0 0 1 1"
            >
              {connections.map(([a, b], idx) => {
                const A = landmarks[a];
                const B = landmarks[b];
                if (!A || !B) return null;

                return (
                  <Line
                    key={`l-${idx}`}
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke="lime"
                    strokeWidth={0.004}
                  />
                );
              })}

              {landmarks.map((p, i) => (
                <Circle key={`p-${i}`} cx={p.x} cy={p.y} r={0.008} fill="lime" />
              ))}
            </Svg>
                  )}
                  {streaming && (
                      <FeedbackOverlay metrics={metrics} />
                  )}
        </View>

        <View style={styles.kneeRow}>
          <View style={styles.kneeBtn}>
            <PrimaryButton
              label={side === "LEFT" ? "Left Knee Selected" : "Select Left Knee"}
              onPress={() => setSide("LEFT")}
            />
          </View>
          <View style={styles.kneeBtn}>
            <PrimaryButton
              label={side === "RIGHT" ? "Right Knee Selected" : "Select Right Knee"}
              onPress={() => setSide("RIGHT")}
            />
          </View>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {side ? (side === "RIGHT" ? "Right knee" : "Left knee") : "No knee selected"} •{" "}
            {facing === "front" ? "Front camera" : "Back camera"}
          </Text>
        </View>

        <PrimaryButton
          label={`Switch to ${facing === "front" ? "back" : "front"} camera`}
          onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
          style={{ marginTop: 8 }}
        />

        <PrimaryButton
          label={streaming ? "Stop Recording" : "Start Recording"}
          onPress={handleToggleRecording}
          style={{ marginTop: 10 }}
        />

        <PrimaryButton
          label={isSaving ? "Saving..." : "Save Metrics & View Progress"}
          onPress={handleSaveMetrics}
          style={{ marginTop: 10 }}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Metrics</Text>

          {/* CHANGED: use displayMetrics so STOP keeps last totals */}
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Angle</Text>
            <Text style={styles.metricValue}>{displayMetrics?.angle ?? 0}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>ROM</Text>
            <Text style={styles.metricValue}>{displayMetrics?.rom_degree ?? 0}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Min</Text>
            <Text style={styles.metricValue}>{displayMetrics?.min_degree ?? 0}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Max</Text>
            <Text style={styles.metricValue}>{displayMetrics?.max_degree ?? 0}</Text>
          </View>
          <View style={[styles.metricRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.metricLabel}>Reps</Text>
            <Text style={styles.metricValue}>{displayMetrics?.rep_count ?? 0}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: { color: "#666", textAlign: "center" },

  cameraBox: {
    height: 260,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#eee",
  },
  camera: { width: "100%", height: "100%" },
  content: { padding: 16, paddingBottom: 40 },

  card: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  metricLabel: { color: "#555", fontWeight: "600" },
  metricValue: { color: "#111", fontWeight: "800" },

  kneeRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  kneeBtn: { flex: 1 },

  pill: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  pillText: { textAlign: "center", color: "#333", fontWeight: "600" },
});

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
//   title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
//   subheading: { fontSize: 18, fontWeight: "200", marginBottom: 8 },
//   text: { color: "#666", textAlign: "center" },
// });