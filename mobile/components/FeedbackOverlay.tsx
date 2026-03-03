import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

//  Types 

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
  type: "error" | "warning" | "info" | "success";
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

//  Constants 

const FLEXION_THRESHOLD = 0.7;
const EXTENSION_THRESHOLD = 0.7;
const CAL_DURATION_S = 10.0;

//  Helpers 

function getNormalizedAngle(metrics: Metrics): number | null {
  const { angle, min_degree, max_degree } = metrics;
  if (max_degree === min_degree) return null;
  return (angle - min_degree) / (max_degree - min_degree);
}

function getFeedback(metrics: Metrics | null): FeedbackInfo {
  // User not detected in frame
  if (!metrics) {
    return {
      type: "error",
      icon: "👤",
      title: "Move into frame",
      subtitle: "Make sure your full leg is visible",
      color: "#FF4444",
    };
  }

  // Calibration phase
  if (metrics.calibrating) {
    const timeLeft = Math.ceil(metrics.cal_time_left);
    return {
      type: "info",
      icon: "⏱",
      title: "Calibrating…",
      subtitle: `Hold still — ${timeLeft}s remaining`,
      color: "#FFB800",
    };
  }

  const normalized = getNormalizedAngle(metrics);

  // Not enough ROM data yet
  if (normalized === null) {
    return {
      type: "info",
      icon: "🦵",
      title: "Getting ready…",
      subtitle: "Start moving your leg",
      color: "#2196F3",
    };
  }

  // In Extension state — needs to extend further to complete rep
  // Rep counts when normalized > EXTENSION_THRESHOLD (0.7)
  if (metrics.rep_state === "Extension" && normalized < EXTENSION_THRESHOLD) {
    const pct = Math.round((1 - normalized / EXTENSION_THRESHOLD) * 100);
    return {
      type: "warning",
      icon: "↑",
      title: "Extend your leg more",
      subtitle: `${pct}% more to complete the rep`,
      color: "#FF8C00",
    };
  }

  // In Flexion state — needs to bend further to trigger rep
  // Rep counts when normalized < 1 - FLEXION_THRESHOLD (0.3)
  if (
    metrics.rep_state === "Flexion" &&
    normalized > 1 - FLEXION_THRESHOLD
  ) {
    const target = 1 - FLEXION_THRESHOLD;
    const pct = Math.round(((normalized - target) / (1 - target)) * 100);
    return {
      type: "warning",
      icon: "↓",
      title: "Bend your knee more",
      subtitle: `${pct}% more to complete the rep`,
      color: "#FF8C00",
    };
  }

  // Good position — within target range
  const stateLabel =
    metrics.rep_state === "Flexion"
      ? "Good bend! Now extend"
      : "Good extension! Now bend";

  return {
    type: "success",
    icon: "✓",
    title: stateLabel,
    subtitle: `${metrics.rep_count} rep${metrics.rep_count !== 1 ? "s" : ""} completed`,
    color: "#00C853",
  };
}

//  Component 

export default function FeedbackOverlay({ metrics }: FeedbackOverlayProps) {
  const feedback = getFeedback(metrics);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Pulse the banner when user needs to correct their position
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
  }, [feedback.type]);

  const normalized =
    metrics && !metrics.calibrating ? getNormalizedAngle(metrics) : null;

  return (
    <View style={styles.container} pointerEvents="none">

      {/* ── Top feedback banner ── */}
      <Animated.View
        style={[
          styles.banner,
          { backgroundColor: feedback.color + "EE", transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.bannerIcon}>{feedback.icon}</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{feedback.title}</Text>
          <Text style={styles.bannerSubtitle}>{feedback.subtitle}</Text>
        </View>
      </Animated.View>

      {/* ── Full-screen overlay when user not detected ── */}
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

      {/* Calibration progress bar  */}
      {metrics?.calibrating && (
        <View style={styles.barContainer}>
          <Text style={styles.barLabel}>Calibrating your range of motion…</Text>
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

      {/* ── Angle progress bar (active exercise) ── */}
      {metrics && !metrics.calibrating && normalized !== null && (
        <View style={styles.barContainer}>
          <View style={styles.angleRow}>
            <Text style={styles.angleEndLabel}>Bend</Text>
            <View style={styles.barTrack}>
              {/* Threshold markers */}
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
              {/* Fill */}
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

// ─── Styles 

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },

  // Banner
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

  // Not-in-frame overlay
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

  // Progress bars (calibration + angle)
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

  // Angle bar row
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
