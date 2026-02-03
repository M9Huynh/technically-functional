import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="exercises" options={{ title: "Exercises" }} />
      <Tabs.Screen name="record" options={{ title: "Record" }} />
      <Tabs.Screen name="progress" options={{ title: "Stats" }} />
      <Tabs.Screen name="feedback" options={{ title: "Feedback" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
