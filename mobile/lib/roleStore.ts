import AsyncStorage from "@react-native-async-storage/async-storage";

const ROLE_KEY = "userRole";

export type UserRole = "patient" | "physio";

export async function setUserRole(role: UserRole) {
  await AsyncStorage.setItem(ROLE_KEY, role);
}

export async function getUserRole(): Promise<UserRole | null> {
  const v = await AsyncStorage.getItem(ROLE_KEY);
  if (v === "patient" || v === "physio") return v;
  return null;
}

export async function clearUserRole() {
  await AsyncStorage.removeItem(ROLE_KEY);
}
