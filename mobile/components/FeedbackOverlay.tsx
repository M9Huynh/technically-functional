import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";

interface Metrics {
  angle: number;
  min_degree: number;
  max_degree: number;
  rom_degree: number;
  rep_count: number;
  rep_state: "Extension" | "Flexion" | "Ready" | "None" | string;
  cue_state?: string;
  calibrating: boolean;
  cal_time_left: number;
  current_rep_duration: number;
  avg_rep_duration: number;
}

interface FeedbackOverlayProps {
  metrics: Metrics | null;
}

interface FeedbackInfo {
  key:
    | "OUT_OF_FRAME"
    | "CALIBRATING"
    | "GETTING_READY"
    | "GOOD_FLEXION"
    | "GOOD_EXTENSION";
  type: "error" | "warning" | "info" | "success";
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

const CAL_DURATION_S = 10.0;

function getFeedback(metrics: Metrics | null): FeedbackInfo {
  if (!metrics) {
    return {
      key: "OUT_OF_FRAME",
      type: "error",
      icon: "👤",
      title: "Move into frame",
      subtitle: "Make sure your full leg is visible",
      color: "#FF4444",
    };
  }

  const cue = metrics.cue_state ?? "GETTING_READY";

  switch (cue) {
    case "OUT_OF_FRAME":
      return {
        key: "OUT_OF_FRAME",
        type: "error",
        icon: "👤",
        title: "Move into frame",
        subtitle: "Make sure your full leg is visible",
        color: "#FF4444",
      };

    case "CALIBRATING":
      return {
        key: "CALIBRATING",
        type: "info",
        icon: "⏱",
        title: "Calibrating…",
        subtitle: `Preparing exercise tracking — ${Math.ceil(
          metrics.cal_time_left
        )}s remaining`,
        color: "#FFB800",
      };

    case "GOOD_FLEXION":
      return {
        key: "GOOD_FLEXION",
        type: "success",
        icon: "✓",
        title: "Good bend! Now extend",
        subtitle: "Keep going",
        color: "#00C853",
      };

    case "GOOD_EXTENSION":
      return {
        key: "GOOD_EXTENSION",
        type: "success",
        icon: "✓",
        title: "Good extension! Now bend",
        subtitle: "Keep going",
        color: "#00C853",
      };

    default:
      return {
        key: "GETTING_READY",
        type: "info",
        icon: "🦵",
        title: "Getting ready…",
        subtitle: "Move into your starting position",
        color: "#2196F3",
      };
  }
}

export default function FeedbackOverlay({ metrics }: FeedbackOverlayProps) {
  const feedback = getFeedback(metrics);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const lastRepCountRef = useRef<number>(0);
  const lastOutOfFrameAtRef = useRef<number>(0);

  const sawCalibrationRef = useRef(false);
  const calibratingSpokenRef = useRef(false);
  const startExerciseAnnouncedRef = useRef(false);

  const [recentRepText, setRecentRepText] = useState<string | null>(null);
  const repToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current = null;
    }

    if (feedback.type === "error" || feedback.type === "warning") {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loopRef.current.start();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [feedback.type, pulseAnim]);

  useEffect(() => {
    if (metrics?.calibrating) {
      sawCalibrationRef.current = true;

      if (!calibratingSpokenRef.current) {
        Speech.stop();
        Speech.speak("Calibrating", { rate: 0.95, pitch: 1.0 });
        calibratingSpokenRef.current = true;
      }
    }
  }, [metrics?.calibrating]);

  useEffect(() => {
    const shouldAnnounceStart =
      !!metrics &&
      !metrics.calibrating &&
      sawCalibrationRef.current &&
      !startExerciseAnnouncedRef.current;

    if (shouldAnnounceStart) {
      Speech.stop();
      Speech.speak("Please start your exercise now", {
        rate: 0.95,
        pitch: 1.0,
      });
      startExerciseAnnouncedRef.current = true;
    }
  }, [metrics]);

  useEffect(() => {
    const now = Date.now();

    if (feedback.key === "OUT_OF_FRAME") {
      if (now - lastOutOfFrameAtRef.current > 2500) {
        Speech.stop();
        Speech.speak("Move into frame", { rate: 0.95, pitch: 1.0 });
        lastOutOfFrameAtRef.current = now;
      }
    } else {
      lastOutOfFrameAtRef.current = 0;
    }
  }, [feedback.key]);

  useEffect(() => {
    if (!metrics || metrics.calibrating) return;
    if (!startExerciseAnnouncedRef.current) return;

    if (metrics.rep_count > lastRepCountRef.current) {
      Speech.stop();
      Speech.speak(`Rep ${metrics.rep_count}`, { rate: 0.95, pitch: 1.0 });

      setRecentRepText(`Rep ${metrics.rep_count} completed`);

      if (repToastTimerRef.current) {
        clearTimeout(repToastTimerRef.current);
      }

      repToastTimerRef.current = setTimeout(() => {
        setRecentRepText(null);
      }, 1200);
    }

    lastRepCountRef.current = metrics.rep_count;
  }, [metrics?.rep_count, metrics?.calibrating, metrics]);

  useEffect(() => {
    return () => {
      if (repToastTimerRef.current) {
        clearTimeout(repToastTimerRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: feedback.color + "EE",
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.bannerIcon}>{feedback.icon}</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>
            {recentRepText ?? feedback.title}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {recentRepText ? "Nice work" : feedback.subtitle}
          </Text>
        </View>
      </Animated.View>

      {feedback.key === "OUT_OF_FRAME" && (
        <View style={styles.fullOverlay}>
          <View style={styles.silhouetteBox}>
            <Text style={styles.silhouetteIcon}>🧍</Text>
          </View>
          <Text style={styles.overlayText}>
            Stand so your full leg is visible in the camera
          </Text>
        </View>
      )}

      {metrics?.calibrating && (
        <View style={styles.barContainer}>
          <Text style={styles.barLabel}>
            Calibrating your range of motion…
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(
                    100,
                    ((CAL_DURATION_S - (metrics.cal_time_left ?? 0)) /
                      CAL_DURATION_S) *
                      100
                  )}%`,
                  backgroundColor: "#FFB800",
                },
              ]}
            />
          </View>
        </View>
      )}

      {!metrics?.calibrating && metrics && (
        <View style={styles.barContainer}>
          <Text style={styles.angleValue}>{Math.round(metrics.angle)}°</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  banner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    marginTop: 2,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "center",
    alignItems: "center",
  },
  silhouetteBox: {
    width: 120,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 60,
    borderStyle: "dashed",
    marginBottom: 20,
  },
  silhouetteIcon: {
    fontSize: 80,
    opacity: 0.5,
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 36,
  },
  barContainer: {
    position: "absolute",
    bottom: 100,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 12,
  },
  barLabel: {
    color: "#FFB800",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 5,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  angleValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
});