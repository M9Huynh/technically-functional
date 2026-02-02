// lib/useraccount.ts 
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
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
  DocumentData,
} from 'firebase/firestore';

////////////////////////////FIREBASE CONFIGURATION

// Your Firebase configuration (or import from a config file)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//////////////////////////// TYPES & INTERFACES 

export interface UserData {
  uid: string;
  acc_id: number;
  email: string;
  name: string;
  role: "patient" | "physio";
  birthday?: string; // ISO format: "1990-01-01"
  licenseNumber?: string; // For physios only
  verified?: boolean; // For physios only
  physioId?: string; // For patients only
  inviteCode?: string; // For patients only
  createdAt?: any;
  updatedAt?: any;
  deleted?: boolean; // Soft delete flag
  deletedAt?: any;
}

// Custom Error Classes
export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownloadError";
  }
}

export class FieldEmptyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldEmptyError";
  }
}

export class LoginMatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginMatchError";
  }
}

export class FirebaseInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseInitializationError";
  }
}

export class NoAvailableIDError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoAvailableIDError";
  }
}

////////////////////////////USERACCOUNT CLASS 
export class UserAccount {
  private usersCollection = "users";
  private idPoolCollection = "system";
  private idPoolDoc = "id_pool";
  private validLicensesCollection = "validLicenses";
  private inviteCodesCollection = "inviteCodes";
  
  private readonly ID_MIN = 10000;
  private readonly ID_MAX = 99999;

  constructor() {
    // Extra
  }

  //////////////////////////// ID POOL MANAGEMENT 

  /**
   * Initialize or refresh the ID pool
   */
  async initializeIdPool(): Promise<void> {
    try {
      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      if (!poolDoc.exists()) {
        // Get all used acc_ids
        const usedIds = new Set<number>();
        const usersSnapshot = await getDocs(collection(db, this.usersCollection));
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.acc_id && data.acc_id >= this.ID_MIN && data.acc_id <= this.ID_MAX) {
            usedIds.add(data.acc_id);
          }
        });

        // Generate all possible IDs
        const allPossibleIds = Array.from(
          { length: this.ID_MAX - this.ID_MIN + 1 },
          (_, i) => i + this.ID_MIN
        );

        // Filter out used IDs
        const availableIds = allPossibleIds.filter((id) => !usedIds.has(id));

        // Shuffle for randomness
        for (let i = availableIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
        }

        // Store in Firestore
        await setDoc(poolRef, {
          available_ids: availableIds,
          used_ids: Array.from(usedIds),
          total_available: availableIds.length,
          last_updated: serverTimestamp(),
        });

        console.log(`ID pool initialized with ${availableIds.length} available IDs`);
      }
    } catch (error) {
      console.error("Error initializing ID pool:", error);
      throw error;
    }
  }

  /**
   * Get a unique acc_id from the pool
   */
  async getUniqueAccId(): Promise<number> {
    try {
      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      // If pool doesn't exist, initialize it
      if (!poolDoc.exists()) {
        await this.initializeIdPool();
        return this.getUniqueAccId(); // Try again
      }

      const poolData = poolDoc.data();
      let availableIds = poolData?.available_ids || [];
      const usedIds = poolData?.used_ids || [];

      // If pool is empty, refresh it
      if (availableIds.length === 0) {
        console.log("ID pool empty, refreshing...");
        await this.initializeIdPool();
        return this.getUniqueAccId();
      }

      // Take the first available ID
      const acc_id = availableIds.shift()!;
      usedIds.push(acc_id);

      // Update the pool
      await updateDoc(poolRef, {
        available_ids: availableIds,
        used_ids: usedIds,
        total_available: availableIds.length,
        last_updated: serverTimestamp(),
      });

      console.log(`Generated acc_id: ${acc_id}`);
      return acc_id;
    } catch (error) {
      console.error("Error getting unique acc_id:", error);
      // Fallback: Generate random ID
      return this.generateRandomAccId();
    }
  }

  /**
   * Fallback method: Generate random ID and validate uniqueness
   */
  private async generateRandomAccId(): Promise<number> {
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const acc_id = Math.floor(this.ID_MIN + Math.random() * (this.ID_MAX - this.ID_MIN + 1));
      
      // Check if this acc_id is already in use
      const existingUser = await this.getUserByAccId(acc_id);
      
      if (!existingUser) {
        console.log(`Generated random acc_id: ${acc_id}`);
        return acc_id;
      }
    }
    
    throw new NoAvailableIDError("Could not generate unique acc_id after maximum attempts");
  }

  /**
   * Return an acc_id to the pool (when user is deleted)
   */
  async returnAccIdToPool(acc_id: number): Promise<void> {
    try {
      // Check if ID is already in use
      const existingUser = await this.getUserByAccId(acc_id);
      if (existingUser) {
        console.log(`Warning: ID ${acc_id} is still in use, not returning to pool`);
        return;
      }

      // Add to current pool
      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      if (poolDoc.exists()) {
        const poolData = poolDoc.data();
        const availableIds = poolData?.available_ids || [];
        const usedIds = poolData?.used_ids || [];

        // Remove from used_ids
        const updatedUsedIds = usedIds.filter((id: number) => id !== acc_id);
        
        // Add to available_ids if not already there
        if (!availableIds.includes(acc_id)) {
          availableIds.push(acc_id);
        }

        await updateDoc(poolRef, {
          available_ids: availableIds,
          used_ids: updatedUsedIds,
          total_available: availableIds.length,
          last_updated: serverTimestamp(),
        });

        console.log(`Returned acc_id ${acc_id} to pool`);
      }
    } catch (error) {
      console.error("Error returning acc_id to pool:", error);
    }
  }

  /**
   * Get ID pool status
   */
  async getPoolStatus() {
    try {
      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      if (poolDoc.exists()) {
        const data = poolDoc.data();
        return {
          total_available: data.total_available || 0,
          available_ids_count: (data.available_ids || []).length,
          used_ids_count: (data.used_ids || []).length,
          last_updated: data.last_updated
        };
      }
      return { error: "Pool document not found" };
    } catch (error) {
      console.error("Error getting pool status:", error);
      return { error: String(error) };
    }
  }

  // ==================== VALIDATION FUNCTIONS ====================

  /**
   * Validate license number format
   */
  licenseFormatValid(licenseNumber: string): boolean {
    return /^[A-Z]{2}-\d{6}$/.test(licenseNumber.trim().toUpperCase());
  }

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

  ////////////////////////////AUTHENTICATION FUNCTIONS 

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<UserData> {
    if (!email || !password) {
      throw new FieldEmptyError("Email and password are required");
    }

    if (!this.validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      const userDoc = await getDoc(doc(db, this.usersCollection, uid));
      if (!userDoc.exists()) {
        throw new UserNotFoundError("User profile missing in Firestore");
      }

      const userData = userDoc.data() as Omit<UserData, "uid">;
      
      // Ensure acc_id exists (for backward compatibility)
      if (!userData.acc_id) {
        const acc_id = await this.getUniqueAccId();
        await updateDoc(doc(db, this.usersCollection, uid), { 
          acc_id,
          updatedAt: serverTimestamp()
        });
        userData.acc_id = acc_id;
      }

      console.log(`User logged in: ${userData.email} (acc_id: ${userData.acc_id})`);
      return { uid, ...userData };
    } catch (error: any) {
      console.error("Login error:", error);
      
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        throw new LoginMatchError("Invalid email or password");
      }
      
      throw new Error(error.message || "Login failed");
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      console.log("User logged out");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  /**
   * Get current authenticated user data
   */
  async getCurrentUser(): Promise<UserData | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, this.usersCollection, user.uid));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data() as Omit<UserData, "uid">;
      return { uid: user.uid, ...userData };
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Register a new physiotherapist
   */
  async registerPhysio(params: {
    name: string;
    email: string;
    password: string;
    licenseNumber: string;
    birthday?: string;
  }): Promise<UserData> {
    // Validate inputs
    if (!params.name || !params.email || !params.password || !params.licenseNumber) {
      throw new FieldEmptyError("All fields are required");
    }

    if (!this.validateName(params.name)) {
      throw new Error("Name must be at least 2 characters");
    }

    if (!this.validateEmail(params.email)) {
      throw new Error("Invalid email format");
    }

    if (!this.validatePassword(params.password)) {
      throw new Error("Password must be at least 6 characters");
    }

    const lic = params.licenseNumber.trim().toUpperCase();

    // License format check
    if (!this.licenseFormatValid(lic)) {
      throw new Error("Invalid license format (example: ON-123456)");
    }

    // License verification (allowlist check)
    const licSnap = await getDoc(doc(db, this.validLicensesCollection, lic));
    if (!licSnap.exists() || licSnap.data()?.active !== true) {
      throw new Error("License not verified or inactive");
    }

    // Check if email already exists
    if (await this.emailExists(params.email)) {
      throw new Error("Email already registered");
    }

    // Generate unique acc_id
    const acc_id = await this.getUniqueAccId();

    // Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    const uid = cred.user.uid;

    // Create Firestore user document
    const userData: Omit<UserData, "uid"> = {
      acc_id,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role: "physio",
      licenseNumber: lic,
      verified: true,
      birthday: params.birthday || null,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.usersCollection, uid), userData);

    console.log(`Physio registered: ${params.name} (acc_id: ${acc_id})`);
    
    return { uid, ...userData };
  }

  /**
   * Register a new patient
   */
  async registerPatient(params: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
    birthday?: string;
  }): Promise<UserData> {
    // Validate inputs
    if (!params.name || !params.email || !params.password || !params.inviteCode) {
      throw new FieldEmptyError("All fields are required");
    }

    if (!this.validateName(params.name)) {
      throw new Error("Name must be at least 2 characters");
    }

    if (!this.validateEmail(params.email)) {
      throw new Error("Invalid email format");
    }

    if (!this.validatePassword(params.password)) {
      throw new Error("Password must be at least 6 characters");
    }

    const code = params.inviteCode.trim().toUpperCase();

    // Validate invite code
    const inviteRef = doc(db, this.inviteCodesCollection, code);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error("Invalid invite code");
    }

    const invite = inviteSnap.data();
    if (invite.active !== true) {
      throw new Error("Invite code inactive");
    }
    if (invite.used === true) {
      throw new Error("Invite code already used");
    }

    const physioId = invite.physioId;
    if (!physioId) {
      throw new Error("Invite code missing physio link");
    }

    // Check if email already exists
    if (await this.emailExists(params.email)) {
      throw new Error("Email already registered");
    }

    // Generate unique acc_id
    const acc_id = await this.getUniqueAccId();

    // Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    const uid = cred.user.uid;

    // Create Firestore user document
    const userData: Omit<UserData, "uid"> = {
      acc_id,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role: "patient",
      physioId,
      inviteCode: code,
      birthday: params.birthday || null,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.usersCollection, uid), userData);

    // Mark invite code as used
    await updateDoc(inviteRef, {
      used: true,
      usedBy: uid,
      usedAt: serverTimestamp(),
    });

    console.log(`Patient registered: ${params.name} (acc_id: ${acc_id})`);
    
    return { uid, ...userData };
  }

  /**
   * Validate username and password match
   */
  async validateCredentials(email: string, password: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback: (user: UserData | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await this.getCurrentUser();
          callback(userData);
        } catch (error) {
          console.error("Error getting user data in auth listener:", error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  ////////////////////////////USER MANAGEMENT FUNCTIONS 

  /**
   * Get user by acc_id
   */
  async getUserByAccId(acc_id: number): Promise<UserData | null> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where("acc_id", "==", acc_id));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const userData = doc.data() as Omit<UserData, "uid">;
      return { uid: doc.id, ...userData };
    } catch (error) {
      console.error("Error getting user by acc_id:", error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserData | null> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
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

  /**
   * Get user by Firebase UID
   */
  async getUserById(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(db, this.usersCollection, uid));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data() as Omit<UserData, "uid">;
      return { uid, ...userData };
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  /**
   * Check if a user with given email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  /**
   * Update user profile
   */
  async updateUser(userData: UserData): Promise<boolean> {
    try {
      if (!userData.acc_id) {
        throw new Error("UserData must have a valid acc_id for update");
      }

      // Find the user by acc_id
      const existingUser = await this.getUserByAccId(userData.acc_id);
      if (!existingUser) {
        throw new UserNotFoundError(`No user found with acc_id: ${userData.acc_id}`);
      }

      // Update the document
      const updateData: Partial<UserData> = {
        name: userData.name,
        email: userData.email,
        birthday: userData.birthday,
        role: userData.role,
        updatedAt: serverTimestamp(),
      };

      // Only update licenseNumber if it's a physio
      if (userData.role === "physio" && userData.licenseNumber) {
        updateData.licenseNumber = userData.licenseNumber;
      }

      await updateDoc(doc(db, this.usersCollection, existingUser.uid), updateData);

      console.log(`User with acc_id ${userData.acc_id} updated successfully`);
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  }

  /**
   * Delete a user by acc_id and return ID to pool
   */
  async deleteUserByAccId(acc_id: number): Promise<boolean> {
    try {
      // Find the user by acc_id
      const user = await this.getUserByAccId(acc_id);
      if (!user) {
        throw new UserNotFoundError(`No user found with acc_id: ${acc_id}`);
      }

      // Soft delete: mark as deleted
      await updateDoc(doc(db, this.usersCollection, user.uid), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });

      // Return ID to pool
      await this.returnAccIdToPool(acc_id);

      console.log(`User with acc_id ${acc_id} deleted successfully`);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  /**
   * Delete a user by email and return ID to pool
   */
  async deleteUserByEmail(email: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new UserNotFoundError(`No user found with email: ${email}`);
      }

      return await this.deleteUserByAccId(user.acc_id);
    } catch (error) {
      console.error("Error deleting user by email:", error);
      return false;
    }
  }

  /**
   * Delete a user by Firebase UID
   */
  async deleteUserById(uid: string): Promise<boolean> {
    try {
      const user = await this.getUserById(uid);
      if (!user) {
        throw new UserNotFoundError(`No user found with uid: ${uid}`);
      }

      return await this.deleteUserByAccId(user.acc_id);
    } catch (error) {
      console.error("Error deleting user by ID:", error);
      return false;
    }
  }

  ////////////////////////////QUERY FUNCTIONS 

  /**
   * Get all users by role
   */
  async getUsersByRole(role: "patient" | "physio"): Promise<UserData[]> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where("role", "==", role));
      const snapshot = await getDocs(q);

      const users: UserData[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as Omit<UserData, "uid">;
        users.push({ uid: doc.id, ...userData });
      });

      return users;
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  /**
   * Get patients for a specific physio
   */
  async getPatientsByPhysio(physioId: string): Promise<UserData[]> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(
        usersRef,
        where("role", "==", "patient"),
        where("physioId", "==", physioId)
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

  /**
   * Get user(s) by name
   */
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

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const snapshot = await usersRef.get();

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

  /**
   * Count users by role
   */
  async countUsersByRole(role: string): Promise<number> {
    const users = await this.getUsersByRole(role as "patient" | "physio");
    return users.length;
  }

  //////////////////////////// SPECIALIZED FUNCTIONS 

  /**
   * Retrieves user account information from the user table
   */
  async getUserdbInfo(name: string, birthday?: string): Promise<{ patients: UserData[]; physios: UserData[] }> {
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
        throw new UserNotFoundError(`No user found with name: ${name}`);
      }

      const patients: UserData[] = [];
      const physios: UserData[] = [];

      userAccounts.forEach(userData => {
        if (userData.role === 'patient') {
          patients.push(userData);
        } else if (userData.role === 'physio') {
          physios.push(userData);
        }
      });

      return { patients, physios };
    } catch (error) {
      console.error(`Error retrieving user info: ${error}`);
      throw new DownloadError(`Failed to download user data: ${error}`);
    }
  }

  /**
   * Allows PT to delete a patient account from the system
   */
  async PTaccountDelete(name: string, email: string): Promise<void> {
    if (!name || !email) {
      throw new FieldEmptyError("Name and email fields cannot be empty");
    }

    try {
      // Find user by name and email
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('name', '==', name), where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new UserNotFoundError(`No user found with name '${name}' and email '${email}'`);
      }

      const deletePromises = snapshot.docs.map(async (doc) => {
        // Get acc_id before deleting
        const data = doc.data();
        const accId = data.acc_id;

        // Soft delete the document
        await updateDoc(doc.ref, {
          deleted: true,
          deletedAt: serverTimestamp(),
        });

        // Return ID to pool
        if (accId) {
          await this.returnAccIdToPool(accId);
        }

        console.log(`Successfully deleted user: ${name} (${email}) with acc_id: ${accId}`);
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error(`Error deleting user account: ${error}`);
      throw error;
    }
  }

  /**
   * Verifies if username and password match for authentication
   */
  async usernamePwMatch(email: string, password: string): Promise<boolean> {
    try {
      const userData = await this.getUserByEmail(email);

      if (!userData) {
        throw new LoginMatchError("Invalid email or password");
      }

      // Note: In a real app, you should verify the password through Firebase Auth
      // not by comparing stored passwords. This is for demonstration.
      const isValid = await this.validateCredentials(email, password);
      
      if (isValid) {
        console.log(`Successful login for user: ${email}`);
        return true;
      } else {
        throw new LoginMatchError("Invalid email or password");
      }
    } catch (error) {
      console.error(`Error during login verification: ${error}`);
      throw new LoginMatchError("Authentication failed");
    }
  }

  /**
   * Authenticate user and return UserData if successful
   */
  async authenticateUser(email: string, password: string): Promise<UserData | null> {
    try {
      if (await this.usernamePwMatch(email, password)) {
        return await this.getUserByEmail(email);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Test Firestore connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const snapshot = await usersRef.limit(1).get();
      console.log("Firestore connection test successful!");
      return true;
    } catch (error) {
      console.error(`Firestore connection test failed: ${error}`);
      return false;
    }
  }

  /**
   * Initialize the system
   */
  async initializeSystem(): Promise<void> {
    try {
      await this.initializeIdPool();
      console.log("System initialized successfully");
    } catch (error) {
      console.error("Error initializing system:", error);
      throw error;
    }
  }
}

////////////////////////// CREATE DEFAULT INSTANCE 

// Create a default instance for easy importing
const userAccount = new UserAccount();

// Initialize system (optional - can be called manually)
userAccount.initializeSystem().catch(console.error);

///////////////////////////// EXPORTS 

export default userAccount;

// Also export the class for custom instances if needed
export { UserAccount };

// Export types
export type { UserData };