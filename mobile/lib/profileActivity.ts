import {
  getFirestore,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc,
  setDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserActivity } from "./temp";
import { format, isSameDay, subDays } from "date-fns";

export type ActivitySummary = {
  totalActivities: number;
  totalComments: number;
  streak: number;
  today: number;
};

export type CommentData = {
  author: string;
  cid: string;
  actid: string;
  uid: string;
  date: string;
  comment: string;
}

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
      totalComments: 0, // This would be calculated from comments in the database TODO
      streak: 0, // This would be calculated from activity dates TODO
      today: activities.filter(a => a.date_performed === new Date().toISOString().split('T')[0]).length,
    };
  }

  export async function repsChartData(uid: string): Promise<{ label: string; value: number }[]> {
    const activities = await getUserActivities(uid);
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const reps = activities
        .filter(a => a.date_performed === dateStr)
        .reduce((sum, current) => sum + (current.completed_reps || 0), 0);
      return { label: new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }), value: reps };
    });
    return last7Days.reverse();
  }

  export async function exerciseChartData(uid: string): Promise<{ label: string; value: number }[]> {
    const activities = await getUserActivities(uid);
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const acts = activities
        .filter(a => a.date_performed === dateStr).length;
      return { label: new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }), value: acts };
    });
    return last7Days.reverse();
  }

  export async function getComments(actid: string): Promise<CommentData[]> {
    const commentsRef = collection(db, "comments");
    const q = query(commentsRef, where("actid", "==", actid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as CommentData);
  }

  export async function postComment(actid: string, uid: string, comment: string): Promise<void> {
    const com = {
      actid,
    }
    const commentsRef = collection(db, "comments");
    const docRef = await addDoc(commentsRef, com);
    const realcom = {
      cid: docRef.id,
      actid,
      uid,
      date: new Date().toISOString(),
      comment,
      author: await getName(uid),
    }
    await setDoc(docRef, realcom);
  }

  export async function getName(uid: string): Promise<string> {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return "Unknown User";
    const userData = userDoc.data();
    return userData.name || "Unnamed User";
  }