// TODO: may need to split up farther into more modules
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// TYPES & INTERFACES

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: "patient" | "physio";
  birthday?: string;
  licenseNumber?: string;
  verified?: boolean;
  physioId?: string;
  inviteCode?: string;
  createdAt?: any;
  updatedAt?: any;
  deleted?: boolean;
  deletedAt?: any;
}

export interface PTLicenseInfo {
  licenseNumber: string;
  province: string;
  status: "active" | "inactive" | "suspended" | "expired";
  verified: boolean;
  verifiedAt?: any;
  verifiedBy?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Custom Error Classes
export class UserAccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccountNotFoundError";
  }
}

export class UserAccountDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccountDownloadError";
  }
}

export class UserAccountFieldEmptyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccountFieldEmptyError";
  }
}

export class UserAccountLoginMatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccountLoginMatchError";
  }
}

export class PTLicenseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PTLicenseValidationError";
  }
}

export class UserAccountFirebaseInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccountFirebaseInitializationError";
  }
}

// USERACCOUNT CLASS
export class UserAccountService {
  private usersCollection = "users";
  private validLicensesCollection = "ptLicenses";
  private inviteCodesCollection = "inviteCodes";

  constructor() {}

  // VALIDATION FUNCTIONS (needed for user management)

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  private validatePassword(password: string): boolean {
    return password.length >= 6;
  }

  private validateName(name: string): boolean {
    return name.trim().length >= 2;
  }

  // AUTHENTICATION FUNCTIONS (minimal set needed for user management)

  async validateCredentials(email: string, password: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (error) {
      return false;
    }
  }

  // USER MANAGEMENT FUNCTIONS

  async getUserData(uid: string): Promise<UserData | null> {
    if (!uid) {
      throw new UserAccountFieldEmptyError("UID is required");
    }

    try {
      const userRef = doc(db, this.usersCollection, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new UserAccountNotFoundError(`No user found with uid: ${uid}`);
      }

      const userData = userSnap.data() as Omit<UserData, "uid">;

      return {
        uid,
        ...userData,
      };
    } catch (error) {
      console.error("Error fetching user data by uid:", error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<UserData | null> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(
        usersRef,
        where("email", "==", email.trim().toLowerCase()),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const userData = doc.data() as Omit<UserData, "uid">;
      return { uid: doc.id, ...userData };
    } catch (error) {
      console.error("Error getting user by email:", error);
      return null;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  async updateUser(uid: string, updates: Partial<UserData>): Promise<boolean> {
    try {
      const existingUser = await this.getUserData(uid);
      if (!existingUser) {
        throw new UserAccountNotFoundError(`No user found with uid: ${uid}`);
      }

      const updateData: Partial<UserData> = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Remove uid from updates if present (shouldn't be updated)
      delete updateData.uid;

      await updateDoc(doc(db, this.usersCollection, uid), updateData);

      console.log(`User with uid ${uid} updated successfully`);
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  }

  async deleteUser(uid: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, this.usersCollection, uid));
      
      if (!userDoc.exists()) {
        return false;
      }

      await updateDoc(doc(db, this.usersCollection, uid), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async deleteUserByEmail(email: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new UserAccountNotFoundError(
          `No user found with email: ${email}`,
        );
      }

      return await this.deleteUser(user.uid);
    } catch (error) {
      console.error("Error deleting user by email:", error);
      return false;
    }
  }

  // QUERY FUNCTIONS

  async getPatientsByPhysio(physioId: string): Promise<UserData[]> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(
        usersRef,
        where("role", "==", "patient"),
        where("physioId", "==", physioId),
        where("deleted", "!=", true),
      );
      const snapshot = await getDocs(q);

      const patients: UserData[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as Omit<UserData, "uid">;
        patients.push({ uid: doc.id, ...userData });
      });

      return patients;
    } catch (error) {
      console.error("Error getting patients by physio:", error);
      return [];
    }
  }

  async getUsersByName(name: string): Promise<UserData[]> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const snapshot = await getDocs(usersRef);

      const searchTerm = name.toLowerCase().trim();
      const users: UserData[] = [];

      snapshot.forEach((doc) => {
        const userData = doc.data() as Omit<UserData, "uid">;
        if (userData.name.toLowerCase().includes(searchTerm)) {
          users.push({ uid: doc.id, ...userData });
        }
      });

      return users;
    } catch (error) {
      console.error("Error searching users by name:", error);
      return [];
    }
  }

  async getAllUsers(): Promise<UserData[]> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const snapshot = await getDocs(usersRef);

      const users: UserData[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as Omit<UserData, "uid">;
        users.push({ uid: doc.id, ...userData });
      });

      return users;
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  // SPECIALIZED FUNCTIONS

  async getUserdbInfo(
    name: string,
    birthday?: string,
  ): Promise<{ patients: UserData[]; physios: UserData[] }> {
    try {
      let usersRef = collection(db, this.usersCollection);
      let q = query(usersRef, where("name", "==", name));

      if (birthday) {
        q = query(q, where("birthday", "==", birthday));
      }

      const snapshot = await getDocs(q);

      const userAccounts: UserData[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as Omit<UserData, "uid">;
        userAccounts.push({ uid: doc.id, ...userData });
      });

      if (userAccounts.length === 0) {
        throw new UserAccountNotFoundError(`No user found with name: ${name}`);
      }

      const patients: UserData[] = [];
      const physios: UserData[] = [];

      userAccounts.forEach((userData) => {
        if (userData.role === "patient") {
          patients.push(userData);
        } else if (userData.role === "physio") {
          physios.push(userData);
        }
      });

      return { patients, physios };
    } catch (error) {
      console.error(`Error retrieving user info: ${error}`);
      throw new UserAccountDownloadError(
        `Failed to download user data: ${error}`,
      );
    }
  }

  async PTaccountDelete(
    physioEmail: string,
    patientName: string,
    patientEmail: string,
  ): Promise<void> {
    if (!physioEmail || !patientName || !patientEmail) {
      throw new UserAccountFieldEmptyError(
        "Physio email, patient name, and patient email are required",
      );
    }

    try {
      const physio = await this.getUserByEmail(physioEmail);
      if (!physio) {
        throw new UserAccountNotFoundError(
          `Physio with email '${physioEmail}' not found`,
        );
      }

      if (physio.role !== "physio") {
        throw new Error("Only physiotherapists can delete patient accounts");
      }

      const usersRef = collection(db, this.usersCollection);
      const q = query(
        usersRef,
        where("name", "==", patientName),
        where("email", "==", patientEmail),
        where("role", "==", "patient"),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new UserAccountNotFoundError(
          `No patient found with name '${patientName}' and email '${patientEmail}'`,
        );
      }

      const patientsToDelete = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return data.physioId === physio.uid;
      });

      if (patientsToDelete.length === 0) {
        throw new Error(
          `Patient '${patientName}' (${patientEmail}) does not belong to physio '${physio.name}'`,
        );
      }

      const deletePromises = patientsToDelete.map(async (doc) => {
        await updateDoc(doc.ref, {
          deleted: true,
          deletedAt: serverTimestamp(),
        });

        console.log(
          `Physio '${physio.name}' deleted patient: ${patientName} (${patientEmail}) with uid: ${doc.id}`,
        );
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error(`Error deleting patient account: ${error}`);
      throw error;
    }
  }

  async usernamePwMatch(email: string, password: string): Promise<boolean> {
    try {
      const userData = await this.getUserByEmail(email);

      if (!userData) {
        throw new UserAccountLoginMatchError("Invalid email or password");
      }

      const isValid = await this.validateCredentials(email, password);

      if (isValid) {
        console.log(`Successful login for user: ${email}`);
        return true;
      } else {
        throw new UserAccountLoginMatchError("Invalid email or password");
      }
    } catch (error) {
      console.error(`Error during login verification: ${error}`);
      throw new UserAccountLoginMatchError("Authentication failed");
    }
  }

  async authenticateUser(
    email: string,
    password: string,
  ): Promise<UserData | null> {
    try {
      if (await this.usernamePwMatch(email, password)) {
        return await this.getUserByEmail(email);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async initializeSystem(): Promise<void> {
    try {
      console.log("System initialized successfully");
    } catch (error) {
      console.error("Error initializing system:", error);
      throw error;
    }
  }
}

// CREATE DEFAULT INSTANCE

const userAccount = new UserAccountService();

// EXPORTS

export default userAccount;