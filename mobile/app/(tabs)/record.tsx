import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Record() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Main (Record)</Text>
      <Text style={styles.text}>
        TODO: Camera + pose/analysis module integration
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  text: { color: "#666", textAlign: "center" },
});
