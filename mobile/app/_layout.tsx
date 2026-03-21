import { Stack } from "expo-router";
import { useInactivityTimeout } from "../hooks/use-inactivity-timeout";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  
  useInactivityTimeout(() => {
    Alert.alert(
      "Session Expired",
      "You have been inactive for 60 minutes. Please log in again.",
      [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
    );
  })

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
