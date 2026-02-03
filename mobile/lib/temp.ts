import { auth, db } from "./firebase";
import { getDoc, doc } from "firebase/firestore";

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