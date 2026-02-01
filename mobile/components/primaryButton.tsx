import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";

export default function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable style={[styles.btn, style]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#222",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
