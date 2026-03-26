import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Speech from "expo-speech";

import ScreenContainer from "@/components/screenContainer";
import PrimaryButton from "../../components/primaryButton";
import FeedbackOverlay from "../../components/FeedbackOverlay";

import Svg, { Circle, Line } from "react-native-svg";

import {
  processFrame,
  precheckFrame,
  resetBackend,
  Landmark,
  Connection,
  Side,
  Facing,
} from "../../lib/poseService";
import { saveMetrics } from "../../lib/metricsService";
import { getUserRole, UserRole } from "../../lib/roleStore";

type SessionState =
  | "idle"
  | "setupCountdown"
  | "precheck"
  | "calibrating"
  | "recording";

export default function Record() {
  const router = useRouter();

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [setupCountdown, setSetupCountdown] = useState(5);
  const [cameraReady, setCameraReady] = useState(false);

  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [streaming, setStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPostRecordingActions, setShowPostRecordingActions] =
    useState(false);

  const [metrics, setMetrics] = useState<any>(null);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);

  const [side, setSide] = useState<Side | null>(null);
  const [facing, setFacing] = useState<Facing>("front");

  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const [savedExercise, setSavedExercise] = useState<string | null>(null);

  const busyRef = useRef(false);

  useEffect(() => {
    const loadRole = async () => {
      const r = await getUserRole();
      setRole(r);
      setLoadingRole(false);
    };
    loadRole();
  }, []);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    let cancelled = false;

    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), ms),
        ),
      ]);

    const tick = async () => {
      if (cancelled) return;

      if (!streaming || !cameraRef.current || !side || busyRef.current) {
        setTimeout(tick, 300);
        return;
      }

      busyRef.current = true;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.12,
          shutterSound: false,
          skipProcessing: true,
          exif: false,
        });

        if (!photo?.base64) return;

        const data: any = await withTimeout(
          processFrame(photo.base64, side, facing),
          2000,
        );

        const hasValidLandmarks =
          Array.isArray(data?.landmarks) && data.landmarks.length === 33;

        setInsufficientData(!hasValidLandmarks);

        if (data?.metrics) {
          setMetrics(data.metrics);

          setFinalMetrics((prev: any) => {
            const next = data.metrics;
            if (!prev) return next;

            const prevReps = prev?.rep_count ?? 0;
            const nextReps = next?.rep_count ?? 0;

            if (nextReps < prevReps) return prev;

            const looksBad =
              nextReps === 0 &&
              next?.min_degree === 0 &&
              next?.max_degree === 0;

            if (looksBad) return prev;

            return next;
          });
        }

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
        setTimeout(tick, 350);
      }
    };

    tick();

    return () => {
      cancelled = true;
      busyRef.current = false;
    };
  }, [streaming, side, facing]);

  useEffect(() => {
    if (!streaming || !metrics) return;

    if (sessionState === "calibrating") {
      if (metrics.calibrating) {
        const secondsLeft = Math.ceil(metrics.cal_time_left ?? 0);
        setStatusMessage(
          `Calibration in progress... ${secondsLeft}s remaining`,
        );
      } else {
        setSessionState("recording");
        setStatusMessage("Exercise in progress...");
      }
    }
  }, [metrics, streaming, sessionState]);

  useEffect(() => {
    if (sessionState !== "setupCountdown") return;

    if (setupCountdown <= 0) {
      const runPrecheck = async () => {
        await resetBackend();
        setSessionState("precheck");
        setStatusMessage("Checking lighting and camera position...");

        const envCheck = await validateEnvironmentBeforeStart();

        if (!envCheck.ok) {
          setSessionState("idle");
          setStatusMessage(null);
          setIsPreparing(false);
          Alert.alert("Adjust Setup", envCheck.message);
          return;
        }

        try {
          await resetBackend();

          setMetrics(null);
          setFinalMetrics(null);
          setLandmarks(null);
          setConnections([]);
          setInsufficientData(false);
          setShowPostRecordingActions(false);

          setSessionState("calibrating");
          setStatusMessage("Calibration in progress...");
          setStreaming(true);
        } catch (e) {
          setSessionState("idle");
          setStatusMessage(null);
          Alert.alert("Error", "Failed to start recording.");
        } finally {
          setIsPreparing(false);
        }
      };

      runPrecheck();
      return;
    }
    //here
    if (setupCountdown === 6) {
      Speech.stop();
      Speech.speak("Get ready", {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setTimeout(() => {
            setSetupCountdown(5);
          }, 500);
        },
      });
    } else if (setupCountdown === 5) {
      Speech.speak("5", {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setTimeout(() => {
            setSetupCountdown(4);
          }, 500);
        },
      });
    } else if (setupCountdown === 4) {
      Speech.speak("4", {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setTimeout(() => {
            setSetupCountdown(3);
          }, 500);
        },
      });
    } else if (setupCountdown === 3) {
      Speech.speak("3", {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setTimeout(() => {
            setSetupCountdown(2);
          }, 500);
        },
      });
    } else if (setupCountdown === 2) {
      Speech.speak("2", {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setTimeout(() => {
            setSetupCountdown(1);
          }, 500);
        },
      });
    } else if (setupCountdown === 1) {
      Speech.speak("1", {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setTimeout(() => {
            setSetupCountdown(0);
          }, 500);
        },
      });
    }
  }, [sessionState, setupCountdown]);

  const validateEnvironmentBeforeStart = async () => {
    if (!cameraRef.current || !cameraReady) {
      return {
        ok: false,
        message: "Camera is not ready yet. Please wait a moment and try again.",
      };
    }

    if (!side) {
      return { ok: false, message: "Please select a knee before recording." };
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.08,
        shutterSound: false,
        skipProcessing: true,
        exif: false,
      });

      if (!photo?.base64) {
        return { ok: false, message: "Could not capture preview frame." };
      }

      const result = await precheckFrame(photo.base64, side, facing);

      return {
        ok: result.ok,
        message: result.message,
      };
    } catch (e: any) {
      console.log("Precheck error:", e?.response?.data || e?.message || e);
      return {
        ok: false,
        message:
          e?.response?.data?.message ||
          e?.message ||
          "Unable to check setup. Please try again.",
      };
    }
  };

  const handleStartRecording = async () => {
    if (isPreparing || streaming) return;

    if (!cameraReady) {
      Alert.alert(
        "Camera Not Ready",
        "Please wait a moment for the camera to finish loading.",
      );
      return;
    }

    if (!side) {
      Alert.alert(
        "Choose a knee first",
        "Select Right or Left knee before recording.",
      );
      return;
    }

    setMetrics(null);
    setFinalMetrics(null);
    setLandmarks(null);
    setConnections([]);
    setInsufficientData(false);
    setShowPostRecordingActions(false);

    setIsPreparing(true);
    setSetupCountdown(6);
    setSessionState("setupCountdown");
    setStatusMessage("Get into position... 5");
  };

  const handleStopRecording = async () => {
    if (!streaming) return;

    setStreaming(false);
    setSessionState("idle");
    setStatusMessage("Recording complete.");
    setShowPostRecordingActions(true);
  };

  const handleRetake = async () => {
    setStreaming(false);
    setMetrics(null);
    setFinalMetrics(null);
    setLandmarks(null);
    setConnections([]);
    setInsufficientData(false);
    setStatusMessage(null);
    setShowPostRecordingActions(false);
    setSessionState("idle");
    setSetupCountdown(5);
    setIsPreparing(false);

    try {
      await resetBackend();
    } catch (e) {
      console.log("Retake reset failed:", e);
    }
  };

  const handleSaveMetrics = async () => {
    const m = finalMetrics;
    if (!m || isSaving) return;

    try {
      setIsSaving(true);

      setSavedExercise(await saveMetrics({
        angle: m.angle || 0,
        rom_degree: m.rom_degree || 0,
        min_degree: m.min_degree || 0,
        max_degree: m.max_degree || 0,
        rep_count: m.rep_count || 0,
        rep_state: m.rep_state || "None",
        avg_rep_duration: m.avg_rep_duration || 0,
        current_rep_duration: m.current_rep_duration || 0,
        timestamp: Date.now(),
      }));

      Alert.alert("Saved", "Metrics saved to Firebase");
      router.push({
        pathname: "/progress",
        params: {
          exerciseId: savedExercise,
          showSurvey: "true",
        },
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save metrics");
    } finally {
      setIsSaving(false);
    }
  };

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

  const displayMetrics = streaming ? metrics : finalMetrics;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cameraBox}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            onCameraReady={() => setCameraReady(true)}
          />

          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>
              {sessionState === "idle" && "Ready"}
              {sessionState === "setupCountdown" && "Get Ready"}
              {sessionState === "precheck" && "Pre-Check"}
              {sessionState === "calibrating" && "Calibrating"}
              {sessionState === "recording" && "Live Analysis"}
            </Text>
          </View>

          {statusMessage && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>{statusMessage}</Text>
            </View>
          )}

          {insufficientData && streaming && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                Adjust lighting, camera angle, or move fully into frame.
              </Text>
            </View>
          )}

          {streaming && landmarks && landmarks.length > 0 && (
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
                <Circle
                  key={`p-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={0.008}
                  fill="lime"
                />
              ))}
            </Svg>
          )}

          {streaming && <FeedbackOverlay metrics={metrics} />}
        </View>

        <View style={styles.kneeRow}>
          <View style={styles.kneeBtn}>
            <PrimaryButton
              label={
                side === "LEFT" ? "Left Knee Selected" : "Select Left Knee"
              }
              onPress={() => setSide("LEFT")}
            />
          </View>
          <View style={styles.kneeBtn}>
            <PrimaryButton
              label={
                side === "RIGHT" ? "Right Knee Selected" : "Select Right Knee"
              }
              onPress={() => setSide("RIGHT")}
            />
          </View>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {side
              ? side === "RIGHT"
                ? "Right knee"
                : "Left knee"
              : "No knee selected"}{" "}
            • {facing === "front" ? "Front camera" : "Back camera"}
          </Text>
        </View>

        <PrimaryButton
          label={`Switch to ${facing === "front" ? "back" : "front"} camera`}
          onPress={() => {
            setCameraReady(false);
            setFacing((f) => (f === "front" ? "back" : "front"));
          }}
          style={{ marginTop: 8 }}
        />

        {!showPostRecordingActions && (
          <PrimaryButton
            label={
              sessionState === "setupCountdown"
                ? `Get Ready (${setupCountdown})`
                : sessionState === "precheck"
                  ? "Checking Setup..."
                  : sessionState === "calibrating"
                    ? "Calibrating..."
                    : streaming
                      ? "Stop Recording"
                      : "Start Recording"
            }
            onPress={streaming ? handleStopRecording : handleStartRecording}
            style={{ marginTop: 10 }}
          />
        )}

        {showPostRecordingActions && (
          <>
            <PrimaryButton
              label="Retake"
              onPress={handleRetake}
              style={{ marginTop: 10 }}
            />
            <PrimaryButton
              label={isSaving ? "Saving..." : "Save Metrics & View Progress"}
              onPress={handleSaveMetrics}
              style={{ marginTop: 10 }}
            />
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Metrics</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Angle</Text>
            <Text style={styles.metricValue}>{displayMetrics?.angle ?? 0}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>ROM</Text>
            <Text style={styles.metricValue}>
              {displayMetrics?.rom_degree ?? 0}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Min</Text>
            <Text style={styles.metricValue}>
              {displayMetrics?.min_degree ?? 0}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Max</Text>
            <Text style={styles.metricValue}>
              {displayMetrics?.max_degree ?? 0}
            </Text>
          </View>
          <View style={[styles.metricRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.metricLabel}>Reps</Text>
            <Text style={styles.metricValue}>
              {displayMetrics?.rep_count ?? 0}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: { color: "#666", textAlign: "center" },

  cameraBox: {
    height: 360,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#eee",
    position: "relative",
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

  statusChip: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusChipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  infoBanner: {
    position: "absolute",
    top: 45,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  infoBannerText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  warningBanner: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255, 170, 0, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  warningText: {
    color: "#222",
    fontWeight: "700",
    textAlign: "center",
  },
});
