import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Dashboard</Text>

      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        style={{
          marginTop: 20,
          backgroundColor: "#222",
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Logout</Text>
      </Pressable>
    </View>
  );
}
