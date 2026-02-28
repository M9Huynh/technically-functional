import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

import ScreenContainer from "@/components/screenContainer";
import PrimaryButton from "../../components/primaryButton";
import FeedbackOverlay from "../../components/FeedbackOverlay";

import Svg, { Circle, Line } from "react-native-svg";

import { processFrame, resetBackend, Landmark, Connection, Side, Facing } from "../../lib/poseService";
import { saveMetrics } from "../../lib/metricsService";

export default function Record() {
  const router = useRouter();

  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [streaming, setStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [metrics, setMetrics] = useState<any>(null);

  // user choices
  const [side, setSide] = useState<Side | null>(null);
  const [facing, setFacing] = useState<Facing>("front");

  // NEW: overlay data
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  // streaming loop
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

  const handleToggleRecording = async () => {
    if (!side) {
      Alert.alert("Choose a knee first", "Select Right or Left knee before recording.");
      return;
    }

    if (!streaming) {
      // Start: reset rep count + calibration
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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Live camera + overlay */}
        <View style={styles.cameraBox}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

          {/* Overlay landmarks (no flashing, drawn on live view) */}
          {landmarks && landmarks.length > 0 && (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1 1">
              {/* draw connections first */}
              {connections.map(([a, b], idx) => {
                const A = landmarks[a];
                const B = landmarks[b];
                if (!A || !B) return null;

                // We already flipped the frame in backend when mirrored,
                // so we DO NOT mirror again here.
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

              {/* points */}
              {landmarks.map((p, i) => (
                <Circle key={`p-${i}`} cx={p.x} cy={p.y} r={0.008} fill="lime" />
              ))}
            </Svg>
          )}
                  {streaming && (
                      <FeedbackOverlay metrics={metrics} />
                  )}
        </View>

        {/* Side selection */}
        <View style={styles.row}>
          <PrimaryButton
            label={side === "RIGHT" ? "Right Knee Selected" : "Select Right Knee"}
            onPress={() => setSide("RIGHT")}
          />
          <PrimaryButton
            label={side === "LEFT" ? "Left Knee Selected" : "Select Left Knee"}
            onPress={() => setSide("LEFT")}
          />
        </View>

        <Text style={styles.selectionText}>
          Selected: {side ? (side === "RIGHT" ? "Right Knee" : "Left Knee") : "None"} • Camera:{" "}
          {facing === "front" ? "Front" : "Back"}
        </Text>

        {/* Camera switch */}
        <PrimaryButton
          label={`Switch to ${facing === "front" ? "back" : "front"} camera`}
          onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
        />

        {/* Start/stop */}
        <PrimaryButton
          label={streaming ? "Stop Recording" : "Start Recording"}
          onPress={handleToggleRecording}
        />

        {/* Save */}
        <PrimaryButton
          label={isSaving ? "Saving..." : "Save Metrics & View Progress"}
          onPress={handleSaveMetrics}
        />

        {/* Metrics */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.title}>Live Metrics</Text>
          <Text>Angle: {metrics?.angle ?? 0}</Text>
          <Text>ROM: {metrics?.rom_degree ?? 0}</Text>
          <Text>Min: {metrics?.min_degree ?? 0}</Text>
          <Text>Max: {metrics?.max_degree ?? 0}</Text>
          <Text>Reps: {metrics?.rep_count ?? 0}</Text>
          <Text>State: {metrics?.rep_state ?? "None"}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: { color: "#666", textAlign: "center" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 8 },

  cameraBox: { height: 260, borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  camera: { width: "100%", height: "100%" },

  selectionText: { marginBottom: 10, color: "#333", fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
});

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
//   title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
//   subheading: { fontSize: 18, fontWeight: "200", marginBottom: 8 },
//   text: { color: "#666", textAlign: "center" },
// });