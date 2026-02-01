import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "userId";

export async function setUserId(userId: string) {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
}

export async function getUserId(): Promise<string | null> {
  const v = await AsyncStorage.getItem(USER_ID_KEY);
  return v;
}

export async function clearUserId() {
  await AsyncStorage.removeItem(USER_ID_KEY);
}