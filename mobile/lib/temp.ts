import { auth, db } from "./firebase";
import { getDoc, doc, getDocs } from "firebase/firestore";

export interface UserData {
  uid: string;
  acc_id: number;
  email: string;
  name: string;
  role: "patient" | "physio";
  birthday?: string; // ISO format: "1990-01-01"
  licenseNumber?: string; // For physios only
  verified?: boolean; // For physios only
  physioId?: string; // For patients only - linking to their physio
  inviteCode?: string; // For patients only
  createdAt?: any;
  updatedAt?: any;
}

export interface UserActivity {
    actid: string;
    analysis: string;
    completed_reps: number;
    completed_sets: number;
    date_performed: string; // ISO format: "2023-10-05T14:48:00.000Z"
    duration: number;
    email: string;
    exercise: string;
    max_height: number;
    min_height: number;
    name: string;
    patient_feedback: string;
    real_rest_time: number;
    target_area: string;
    uid: string;
}

export async function getCurrentUser(): Promise<UserData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as Omit<UserData, "uid">;
    return { uid: user.uid, ...userData };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}