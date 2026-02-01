import {
  getFirestore,
  collection,
  query,
  where,
  getDoc,
  getDocs,
} from "firebase/firestore";

export async function fetchActivityHsitory(uid: string) {
  const db = getFirestore();
  const historyCol = collection(db, "activityHistory");
  const q = query(historyCol, where("userId", "==", uid));
  const querySnapshot = await getDocs(q);
}