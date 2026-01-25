import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AppLogo({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, small && styles.titleSmall]}>
        Physio{"\n"}Companion
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: 12 },
  title: { fontSize: 44, fontWeight: "800", textAlign: "center" },
  titleSmall: { fontSize: 34 },
});
