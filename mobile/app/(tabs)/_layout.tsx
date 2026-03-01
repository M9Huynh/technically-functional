// import { Tabs } from "expo-router";

// export default function TabsLayout() {
//   return (
//     <Tabs screenOptions={{ headerShown: false }}>
//       <Tabs.Screen name="index" options={{ title: "Home" }} />
//       <Tabs.Screen name="exercises" options={{ title: "Exercises" }} />
//       <Tabs.Screen name="record" options={{ title: "Record" }} />
//       <Tabs.Screen name="progress" options={{ title: "Stats" }} />
//       <Tabs.Screen name="feedback" options={{ title: "Feedback" }} />
//       <Tabs.Screen name="profile" options={{ title: "Profile" }} />
//     </Tabs>
//   );
// }
import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getUserRole, UserRole } from "../../lib/roleStore";

export default function TabsLayout() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await getUserRole();
      setRole(r);
      setLoadingRole(false);
    })();
  }, []);

  // Prevent flicker while role loads
  if (loadingRole) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
      }}
    >
      {/* 1) HOME (index) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 2) EXERCISES */}
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercises",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 3) RECORD (patients only) */}

        <Tabs.Screen
          name="record"
          options={{
            title: "Record",
            href: role === "physio" ? null : "/record",   //physio: hide record tab
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="videocam-outline" size={size} color={color} />
            ),
          }}
        />

      {/* 4) PROGRESS */}
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 5) FEEDBACK */}
      <Tabs.Screen
        name="feedback"
        options={{
          title: "Feedback",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 6) PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}