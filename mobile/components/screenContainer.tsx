import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";

export default function ScreenContainer({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 22 },
});
