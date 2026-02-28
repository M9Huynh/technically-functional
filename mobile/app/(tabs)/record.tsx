import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

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

  const [side, setSide] = useState<Side | null>(null);
  const [facing, setFacing] = useState<Facing>("front");

  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Streaming loop
  useEffect(() => {
    if (!streaming) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(async () => {
      if (busyRef.current) return;
      if (!cameraRef.current) return;
      if (!side) return;

      busyRef.current = true;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.25,
          skipProcessing: true,
        });

        if (!photo?.base64) return;

        const data = await processFrame(photo.base64, side, facing);

        if (data?.metrics) setMetrics(data.metrics);
        setLandmarks(data?.landmarks ?? null);
        setConnections(data?.connections ?? []);
      } catch (e) {
        console.log("Frame error:", e);
      } finally {
        busyRef.current = false;
      }
    }, 350);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
      Alert.alert("Choose a knee first", "Select Right or Left knee before recording.");
      return;
    }

    if (!streaming) {
      try {
        await resetBackend();
      } catch (e) {
        console.log("Reset failed:", e);
      }
      setMetrics(null);
      setLandmarks(null);
      setConnections([]);
    }

    setStreaming((s) => !s);
  };

  const handleSaveMetrics = async () => {
    if (!metrics || isSaving) return;

    try {
      setIsSaving(true);

      await saveMetrics({
        angle: metrics.angle || 0,
        rom_degree: metrics.rom_degree || 0,
        min_degree: metrics.min_degree || 0,
        max_degree: metrics.max_degree || 0,
        rep_count: metrics.rep_count || 0,
        rep_state: metrics.rep_state || "None",
        avg_rep_duration: metrics.avg_rep_duration || 0,
        current_rep_duration: metrics.current_rep_duration || 0,
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

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cameraBox}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

          {landmarks && landmarks.length > 0 && (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1 1">
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
        {/* adding pill for selection text */}
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

          <View style={styles.metricRow}><Text style={styles.metricLabel}>Angle</Text><Text style={styles.metricValue}>{metrics?.angle ?? 0}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>ROM</Text><Text style={styles.metricValue}>{metrics?.rom_degree ?? 0}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Min</Text><Text style={styles.metricValue}>{metrics?.min_degree ?? 0}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Max</Text><Text style={styles.metricValue}>{metrics?.max_degree ?? 0}</Text></View>
          <View style={[styles.metricRow, { borderBottomWidth: 0 }]}><Text style={styles.metricLabel}>Reps</Text><Text style={styles.metricValue}>{metrics?.rep_count ?? 0}</Text></View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: { color: "#666", textAlign: "center" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 8 },

  cameraBox: { height: 260, borderRadius: 18, overflow: "hidden", marginBottom: 14, backgroundColor: "#000", borderWidth: 1, borderColor: "#eee",},
  camera: { width: "100%", height: "100%" },
  content: { padding: 16, paddingBottom: 40 },

  card: { marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#eee",},
  cardTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f2f2f2",},
  metricLabel: { color: "#555", fontWeight: "600" },
  metricValue: { color: "#111", fontWeight: "800" },

  kneeRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  kneeBtn: { flex: 1 },

  pill: { backgroundColor: "#F5F5F5", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: "#EAEAEA",},
  pillText: { textAlign: "center", color: "#333", fontWeight: "600" },

  selectionText: { marginBottom: 10, color: "#333", fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
});

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
//   title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
//   subheading: { fontSize: 18, fontWeight: "200", marginBottom: 8 },
//   text: { color: "#666", textAlign: "center" },
// });