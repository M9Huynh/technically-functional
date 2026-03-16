import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";

interface Metrics {
  angle: number;
  min_degree: number;
  max_degree: number;
  rom_degree: number;
  rep_count: number;
  rep_state: "Extension" | "Flexion" | "None" | string;
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
    | "EXTEND_MORE"
    | "BEND_MORE"
    | "GOOD_FLEXION"
    | "GOOD_EXTENSION";
  type: "error" | "warning" | "info" | "success";
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

const FLEXION_THRESHOLD = 0.7;
const EXTENSION_THRESHOLD = 0.7;
const CAL_DURATION_S = 10.0;

function getNormalizedAngle(metrics: Metrics): number | null {
  const { angle, min_degree, max_degree } = metrics;
  if (max_degree === min_degree) return null;
  return (angle - min_degree) / (max_degree - min_degree);
}

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

  if (metrics.calibrating) {
    const timeLeft = Math.ceil(metrics.cal_time_left);
    return {
      key: "CALIBRATING",
      type: "info",
      icon: "⏱",
      title: "Calibrating…",
      subtitle: `Hold still — ${timeLeft}s remaining`,
      color: "#FFB800",
    };
  }

  const normalized = getNormalizedAngle(metrics);

  if (normalized === null) {
    return {
      key: "GETTING_READY",
      type: "info",
      icon: "🦵",
      title: "Getting ready…",
      subtitle: "Start moving your leg",
      color: "#2196F3",
    };
  }

  if (metrics.rep_state === "Extension" && normalized < EXTENSION_THRESHOLD) {
    const pct = Math.round((1 - normalized / EXTENSION_THRESHOLD) * 100);
    return {
      key: "EXTEND_MORE",
      type: "warning",
      icon: "↑",
      title: "Extend your leg more",
      subtitle: `${pct}% more to complete the rep`,
      color: "#FF8C00",
    };
  }

  if (
    metrics.rep_state === "Flexion" &&
    normalized > 1 - FLEXION_THRESHOLD
  ) {
    const target = 1 - FLEXION_THRESHOLD;
    const pct = Math.round(((normalized - target) / (1 - target)) * 100);
    return {
      key: "BEND_MORE",
      type: "warning",
      icon: "↓",
      title: "Bend your knee more",
      subtitle: `${pct}% more to complete the rep`,
      color: "#FF8C00",
    };
  }

  const isFlexion = metrics.rep_state === "Flexion";

  return {
    key: isFlexion ? "GOOD_FLEXION" : "GOOD_EXTENSION",
    type: "success",
    icon: "✓",
    title: isFlexion
      ? "Good bend! Now extend"
      : "Good extension! Now bend",
    subtitle: `${metrics.rep_count} rep${
      metrics.rep_count !== 1 ? "s" : ""
    } completed`,
    color: "#00C853",
  };
}

export default function FeedbackOverlay({ metrics }: FeedbackOverlayProps) {
  const feedback = getFeedback(metrics);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const lastSpokenAtRef = useRef<number>(0);
  const lastRepCountRef = useRef<number>(0);
  const lastOutOfFrameAtRef = useRef<number>(0);

  const sawCalibrationRef = useRef(false);
  const calibratingSpokenRef = useRef(false);
  const startExerciseAnnouncedRef = useRef(false);

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

  // Say "Calibrating" once only at the start
  useEffect(() => {
    if (metrics?.calibrating) {
      sawCalibrationRef.current = true;

      if (!calibratingSpokenRef.current) {
        Speech.stop();
        Speech.speak("Calibrating", {
          rate: 0.95,
          pitch: 1.0,
        });

        calibratingSpokenRef.current = true;
        lastSpokenAtRef.current = Date.now();
      }
    }
  }, [metrics?.calibrating]);

  // Say "Please start your exercise now" once when calibration first finishes
  useEffect(() => {
    const now = Date.now();

    const shouldAnnounceStart =
      !!metrics &&
      !metrics.calibrating &&
      sawCalibrationRef.current &&
      !startExerciseAnnouncedRef.current;

    if (shouldAnnounceStart && now - lastSpokenAtRef.current > 1000) {
      Speech.stop();
      Speech.speak("Please start your exercise now", {
        rate: 0.95,
        pitch: 1.0,
      });

      startExerciseAnnouncedRef.current = true;
      lastSpokenAtRef.current = now;
    }
  }, [metrics]);

  // Say "Move into frame" whenever the FEEDBACK says out of frame
  useEffect(() => {
    const now = Date.now();

    if (feedback.key === "OUT_OF_FRAME") {
      if (now - lastOutOfFrameAtRef.current > 3000) {
        Speech.stop();
        Speech.speak("Move into frame", {
          rate: 0.95,
          pitch: 1.0,
        });

        lastOutOfFrameAtRef.current = now;
        lastSpokenAtRef.current = now;
      }
    }
  }, [feedback.key]);

  // Speak rep count when it increases
  useEffect(() => {
    if (!metrics || metrics.calibrating) return;
    if (!startExerciseAnnouncedRef.current) return;

    if (metrics.rep_count > lastRepCountRef.current) {
      Speech.speak(`Rep ${metrics.rep_count}`, {
        rate: 0.95,
        pitch: 1.0,
      });

      lastSpokenAtRef.current = Date.now();
    }

    lastRepCountRef.current = metrics.rep_count;
  }, [metrics?.rep_count, metrics?.calibrating, metrics]);

  const normalized =
    metrics && !metrics.calibrating ? getNormalizedAngle(metrics) : null;

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
          <Text style={styles.bannerTitle}>{feedback.title}</Text>
          <Text style={styles.bannerSubtitle}>{feedback.subtitle}</Text>
        </View>
      </Animated.View>

      {!metrics && (
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

      {metrics && !metrics.calibrating && normalized !== null && (
        <View style={styles.barContainer}>
          <View style={styles.angleRow}>
            <Text style={styles.angleEndLabel}>Bend</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.thresholdMarker,
                  { left: `${(1 - FLEXION_THRESHOLD) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.thresholdMarker,
                  { left: `${EXTENSION_THRESHOLD * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(100, Math.max(0, normalized * 100))}%`,
                    backgroundColor: feedback.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.angleEndLabel}>Extend</Text>
          </View>
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
  thresholdMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
    zIndex: 1,
  },
  angleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  angleEndLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    width: 40,
  },
  angleValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});