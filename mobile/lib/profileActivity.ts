import {
  getFirestore,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserActivity } from "./temp";

export type ActivitySummary = {
  totalActivities: number;
  totalComments: number;
  streak: number;
  today: number;
};

export async function getActivitiesFromEmail(email: string) {
  const db = getFirestore();
  const historyCol = collection(db, "activities");
  const q = query(historyCol, where("email", "==", email));
  const querySnapshot = await getDocs(q);
}

export async function getUserActivities(uid: string): Promise<UserActivity[]> {
  try {
    const activitiesRef = collection(db, "activities");
    const q = query(activitiesRef, where("uid", "==", uid));
    const snapshot = await getDocs(q);
    const activities: UserActivity[] = [];
    snapshot.forEach((doc) => {
      activities.push(doc.data() as UserActivity);
    });
    return activities;
  } catch (error) {
    console.error("Error getting user activities:", error);
    return [];
  }}

  export async function getUserSummary(uid: string): Promise<ActivitySummary> {
    const activities = await getUserActivities(uid);
    return {
      totalActivities: activities.length,
      totalComments: 0, // This would be calculated from comments in the database
      streak: 0, // This would be calculated from activity dates
      today: activities.filter(a => a.date_performed === new Date().toISOString().split('T')[0]).length,
    };
  }