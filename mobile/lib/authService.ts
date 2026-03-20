import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    // Using Firebase Auth to check if email is already registered
    const methods = await fetchSignInMethodsForEmail(auth, email.trim());
    return methods.length > 0;
  } catch (error) {
    console.error("Error checking email:", error);
    return false; // Assume email doesn't exist on error to allow registration attempt
  }
}

// Change this if your PT license format is different.
// Example: ON-123456
export function licenseFormatValid(licenseNumber: string) {
  return /^[A-Z]{2}-\d{6}$/.test(licenseNumber.trim().toUpperCase());
}

export async function login(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;

    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) throw new Error("User profile missing in Firestore.");

    return { uid, ...(userSnap.data() as any) };
  } catch (error: any) {
    // Handle specific Firebase auth errors
    if (error.code === 'auth/invalid-credential' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/user-not-found') {
      throw new Error('Invalid email or password. Please try again.');
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }
    if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled. Please contact support.');
    }
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    // For any other errors, throw a generic message
    console.error('Login error:', error);
    throw new Error('Login failed. Please try again.');
  }
}

export async function logout() {
  await signOut(auth);
}

export async function registerPhysio(params: {
  name: string;
  email: string;
  password: string;
  licenseNumber: string;
  birthday: string;
}) {
  const lic = params.licenseNumber.trim().toUpperCase();

  // 1) format check
  if (!licenseFormatValid(lic)) {
    throw new Error("Invalid license format (example: ON-123456).");
  }

  // 2) allowlist check (recommended)
  const licSnap = await getDoc(doc(db, "validLicenses", lic));
  if (!licSnap.exists() || licSnap.data()?.active !== true) {
    throw new Error("License not verified.");
  }

  // 3) create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(
    auth,
    params.email.trim(),
    params.password
  );
  const uid = cred.user.uid;

  // 4) create Firestore user doc
  await setDoc(doc(db, "users", uid), {
    role: "physio",
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    licenseNumber: lic,
    verified: true,
    createdAt: serverTimestamp(),
  });

  return { uid, role: "physio" };
}

export async function registerPatient(params: {
  name: string;
  email: string;
  password: string;
  inviteCode: string;
  birthday: string;
}) {
  const code = params.inviteCode.trim().toUpperCase();

  // 1) validate invite code exists
  const inviteRef = doc(db, "inviteCodes", code);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error("Invalid invite code.");
  const invite = inviteSnap.data();

  if (invite.active !== true) throw new Error("Invite code inactive.");
  if (invite.used === true) throw new Error("Invite code already used.");

  const physioId = invite.physioId;
  if (!physioId) throw new Error("Invite code missing physio link.");

  // 2) create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(
    auth,
    params.email.trim(),
    params.password
  );
  const uid = cred.user.uid;

  // 3) create Firestore user doc
  await setDoc(doc(db, "users", uid), {
    role: "patient",
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    physioId,
    inviteCode: code,
    createdAt: serverTimestamp(),
  });

  // 4) mark invite used
  await updateDoc(inviteRef, { used: true, usedBy: uid });

  return { uid, role: "patient" };
}
