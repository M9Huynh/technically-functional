import {
  getFirestore,
  collection,
  query,
  where,
  getDoc,
  getDocs,
} from "firebase/firestore";

export async function getActivitiesFromEmail(email: string) {
  const db = getFirestore();
  const historyCol = collection(db, "activities");
  const q = query(historyCol, where("email", "==", email));
  const querySnapshot = await getDocs(q);
}