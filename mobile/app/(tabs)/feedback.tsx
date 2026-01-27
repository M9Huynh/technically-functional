import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Feedback() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comment / Feedback</Text>
      <Text style={styles.text}>TODO: short survey + PT comments</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  text: { color: "#666", textAlign: "center" },
});
