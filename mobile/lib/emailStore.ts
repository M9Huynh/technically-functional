import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "userEmail";

export async function setUserEmail(userId: string) {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
}

export async function getUserEmail(): Promise<string | null> {
  const v = await AsyncStorage.getItem(USER_ID_KEY);
  return v;
}

export async function clearEmail() {
  await AsyncStorage.removeItem(USER_ID_KEY);
}