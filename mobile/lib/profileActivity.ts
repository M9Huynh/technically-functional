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
import { auth, db } from "./firebase";
import { UserActivity } from "./temp";
import { format, isSameDay, subDays } from "date-fns";
import { UserData } from "./useraccount";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserAccountService } from "./useraccount";

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
};

const USER_KEY = "selectedUserID";
const uas = new UserAccountService();

export async function getCurrentUser(): Promise<UserData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    console.log("getDoc is:", getDoc);
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as Omit<UserData, "uid">;
    return { uid: user.uid, ...userData };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function getCurrentUserID(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.uid;
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
    // sort by date_performed in descending order (most recent first)
    activities.sort((a, b) => {
      const dateA = new Date(a.date_performed).getTime();
      const dateB = new Date(b.date_performed).getTime();
      return dateB - dateA;
    });
    return activities;
  } catch (error) {
    console.error("Error getting user activities:", error);
    return [];
  }
}

export async function getUserSummary(uid: string): Promise<ActivitySummary> {
  const activities = await getUserActivities(uid);
  if (activities.length === 0) {
    return {
      totalActivities: 0,
      totalComments: 0,
      streak: 0,
      today: 0,
    };
  }
  const dates = activities.map(
    (a) => new Date(a.date_performed).toISOString().split("T")[0],
  );
  let streakCount = 0;
  const today = new Date();

  const commentsRef = collection(db, "comments");
  const q = query(commentsRef, where("uid", "==", uid));
  const commentsSnapshot = await getDocs(q);
  const totalComments = commentsSnapshot.size;

  while (true) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - streakCount);
    const dateStr = checkDate.toISOString().split("T")[0];
    if (!dates.includes(dateStr)) break;
    streakCount += 1;
  }

  return {
    totalActivities: activities.length,
    totalComments: totalComments,
    streak: streakCount,
    today: activities.filter(
      (a) => a.date_performed === new Date().toISOString().split("T")[0],
    ).length,
  };
}

export async function repsChartData(
  uid: string,
): Promise<{ label: string; value: number }[]> {
  const activities = await getUserActivities(uid);
  console.log("Activities for reps chart:", activities);
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");
    const reps = activities
      .filter((a) => a.date_performed === dateStr)
      .reduce((sum, current) => sum + (current.completed_reps || 0), 0);
    return {
      label: new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
      }),
      value: reps,
    };
  });
  console.log("Reps chart data:", last7Days.reverse());
  return last7Days.reverse();
}

export async function exerciseChartData(
  uid: string,
): Promise<{ label: string; value: number }[]> {
  const activities = await getUserActivities(uid);
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");
    const acts = activities.filter((a) => a.date_performed === dateStr).length;
    return {
      label: new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
      }),
      value: acts,
    };
  });
  console.log("Exercise chart data:", last7Days.reverse());
  return last7Days.reverse();
}

export async function getComments(actid: string): Promise<CommentData[]> {
  const commentsRef = collection(db, "comments");
  const q = query(commentsRef, where("actid", "==", actid));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as CommentData);
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
}

export async function postComment(
  actid: string,
  uid: string,
  comment: string,
): Promise<void> {
  const com = {
    actid,
  };
  if (comment.length === 0) {
    console.warn("Attempted to post an empty comment.");
    return;
  }
  try {
    const commentsRef = collection(db, "comments");
    console.log("Posting comment with data:", com);
    const docRef = await addDoc(commentsRef, com);
    const realcom = {
      cid: docRef.id,
      actid,
      uid,
      date: new Date().toISOString(),
      comment,
      author: await getName(uid),
    };
    await setDoc(docRef, realcom);
  } catch (error) {
    console.error("Error posting comment:", error);
    return;
  }
}

export async function getName(uid: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return "Unknown User";
    const userData = userDoc.data();
    return userData.name || "Unnamed User";
  } catch (error) {
    console.error("Error getting user name:", error);
    return "Unknown User";
  }
}

export async function setSelectedUserID(uid: string): Promise<void> {
  if (uid.length === 0) {
    console.warn("Attempted to set an empty user ID.");
    return;
  }
  await AsyncStorage.setItem(USER_KEY, uid);
}

export async function getSelectedUserID(): Promise<string | null> {
  const v = AsyncStorage.getItem(USER_KEY);
  return v;
}

export async function getSelectedUser(): Promise<UserData | null> {
  const r = await AsyncStorage.getItem(USER_KEY);
  if (!r) return null;
  return uas.getUserData(r);
}

export async function clearSelectedUserID() {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getPhysioInviteCode(
  physioID: string,
): Promise<string | null> {
  const usersRef = await collection(db, "inviteCodes");
  const q = query(usersRef, where("physioId", "==", physioID));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const userDoc = snapshot.docs[0];
  return userDoc.id || null;
}
