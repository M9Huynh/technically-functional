import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

import ScreenContainer from "@/components/screenContainer";
import PrimaryButton from "../../components/primaryButton";

import Svg, { Circle, Line } from "react-native-svg";

import { 
  resetBackend, 
  connectWebSocket,
  sendFrame,
  Landmark, 
  Connection, 
  Side, 
  Facing 
} from "../../lib/poseService";
import { saveMetrics } from "../../lib/metricsService";

export default function Record() {
  const router = useRouter();

  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [streaming, setStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [frameTime, setFrameTime] = useState(0);

  const [metrics, setMetrics] = useState<any>(null);

  // user choices
  const [side, setSide] = useState<Side | null>(null);
  const [facing, setFacing] = useState<Facing>("front");

  // overlay data
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  // streaming loop with WebSocket
  useEffect(() => {
    if (!streaming || !side) {
      // Cleanup when stopping
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    console.log('🎥 Starting WebSocket streaming...');
    
    // Connect WebSocket
    disconnectRef.current = connectWebSocket(
      // onMessage callback
      (data) => {
        if (data?.metrics) setMetrics(data.metrics);
        setLandmarks(data?.landmarks ?? null);
        setConnections(data?.connections ?? []);
        if (data.processing_time) {
          setFrameTime(data.processing_time);
        }
      },
      // onError callback
      (error) => {
        console.error('WebSocket error:', error);
        Alert.alert('Connection Error', 'Lost connection to server. Stopping recording.');
        setStreaming(false);
      }
    );

    setWsConnected(true);

    // Send frames continuously
    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current) return;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.1,
          width: 160,
          height: 120,
          skipProcessing: true,
        });

        if (photo?.base64) {
          sendFrame(photo.base64, side, facing);
        }
      } catch (e) {
        console.log('Capture error:', e);
      }
    }, 100); // Send every 100ms (aiming for 10 FPS)

    // Cleanup
    return () => {
      console.log('🛑 Stopping WebSocket streaming...');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
      setWsConnected(false);
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
        angle: metrics.current_angle || metrics.angle || 0,
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
        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, wsConnected ? styles.connected : styles.disconnected]}>
            WebSocket: {wsConnected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          {frameTime > 0 && (
            <Text style={styles.statusText}>Frame time: {frameTime}ms</Text>
          )}
        </View>

        {/* Live camera + overlay */}
        <View style={styles.cameraBox}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

          {/* Overlay landmarks */}
          {landmarks && landmarks.length > 0 && (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1 1">
              {/* draw connections first */}
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

              {/* points */}
              {landmarks.map((p, i) => (
                <Circle key={`p-${i}`} cx={p.x} cy={p.y} r={0.008} fill="lime" />
              ))}
            </Svg>
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
          <Text>Angle: {metrics?.current_angle ?? metrics?.angle ?? 0}</Text>
          <Text>ROM: {metrics?.rom_degree ?? 0}</Text>
          <Text>Min: {metrics?.min_degree ?? 0}</Text>
          <Text>Max: {metrics?.max_degree ?? 0}</Text>
          <Text>Reps: {metrics?.rep_count ?? 0}</Text>
          <Text>State: {metrics?.rep_state ?? "None"}</Text>
          <Text>Calibrating: {metrics?.calibrating ? "Yes" : "No"}</Text>
          {metrics?.cal_time_left > 0 && (
            <Text>Cal time left: {metrics.cal_time_left}s</Text>
          )}
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
  statusContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 8,
    paddingHorizontal: 4 
  },
  statusText: { fontSize: 12, fontWeight: "500" },
  connected: { color: "green" },
  disconnected: { color: "red" },
});