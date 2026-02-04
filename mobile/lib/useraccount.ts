// TODO: may need to split up farther into more modules
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
} from 'firebase/firestore';
import {auth, db} from './firebase'
// FIREBASE CONFIGURATION 

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "your-app-id"
};

// TYPES & INTERFACES 

export interface UserData {
  uid: string;
  acc_id: number;
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
  status: 'active' | 'inactive' | 'suspended' | 'expired';
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

export class UserAccountNoAvailableIDError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccountNoAvailableIDError";
  }
}

// USERACCOUNT CLASS
export class UserAccountService {
  private usersCollection = "users";
  private idPoolCollection = "system";
  private idPoolDoc = "id_pool";
  private validLicensesCollection = "ptLicenses";
  private inviteCodesCollection = "inviteCodes";
  
  private readonly ID_MIN = 10000;
  private readonly ID_MAX = 99999;

  constructor() {}

  // LICENSE VALIDATION FUNCTIONS 
  // These functions are responsible for checking if entered PT license is valid and exists in the database.
  //-----------------------------------------------------------------

  licenseFormatValid(licenseNumber: string): boolean {
    return /^[A-Z]{2}-\d{6}$/.test(licenseNumber.trim().toUpperCase());
  }

  async validateLicense(licenseNumber: string): Promise<PTLicenseInfo> {
    if (!licenseNumber) {
      throw new PTLicenseValidationError("License number is required");
    }

    const lic = licenseNumber.trim().toUpperCase();

    if (!this.licenseFormatValid(lic)) {
      throw new PTLicenseValidationError(
        "Invalid license format. Expected format: XX-123456 (e.g., ON-123456)"
      );
    }

    try {
      const licenseRef = doc(db, this.validLicensesCollection, lic);
      const licenseDoc = await getDoc(licenseRef);

      if (!licenseDoc.exists()) {
        throw new PTLicenseValidationError(
          `License number ${lic} not found in system`
        );
      }

      const licenseData = licenseDoc.data() as PTLicenseInfo;

      if (licenseData.status !== 'active') {
        throw new PTLicenseValidationError(
          `License ${lic} is ${licenseData.status}. Only active licenses are accepted.`
        );
      }

      if (!licenseData.verified) {
        throw new PTLicenseValidationError(
          `License ${lic} is not verified. Please contact administrator.`
        );
      }

      console.log(`License ${lic} validated successfully`);
      return licenseData;

    } catch (error: any) {
      if (error instanceof PTLicenseValidationError) {
        throw error;
      }
      console.error("License validation error:", error);
      throw new PTLicenseValidationError(
        `Error validating license: ${error.message || "Unknown error"}`
      );
    }
  }
  async isLicenseAlreadyRegistered(licenseNumber: string): Promise<boolean> {
    try {
      const usersRef = collection(db, this.usersCollection);
      const q = query(
        usersRef, 
        where("licenseNumber", "==", licenseNumber.trim().toUpperCase()),
        where("role", "==", "physio")
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking if license is registered:", error);
      return false;
    }
  }

  // TODO: include search physio by license no?

  //--------------------------------------------------------------------------------------
  // ID POOL MANAGEMENT 

  async initializeIdPool(): Promise<void> {
    try {
      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      if (!poolDoc.exists()) {
        const usedIds = new Set<number>();
        const usersSnapshot = await getDocs(collection(db, this.usersCollection));
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.acc_id && data.acc_id >= this.ID_MIN && data.acc_id <= this.ID_MAX) {
            usedIds.add(data.acc_id);
          }
        });

        const allPossibleIds = Array.from(
          { length: this.ID_MAX - this.ID_MIN + 1 },
          (_, i) => i + this.ID_MIN
        );

        const availableIds = allPossibleIds.filter((id) => !usedIds.has(id));

        for (let i = availableIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
        }

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

  async getUniqueAccId(): Promise<number> {
    try {
      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      if (!poolDoc.exists()) {
        await this.initializeIdPool();
        return this.getUniqueAccId();
      }

      const poolData = poolDoc.data();
      let availableIds = poolData?.available_ids || [];
      const usedIds = poolData?.used_ids || [];

      if (availableIds.length === 0) {
        console.log("ID pool empty");
        await this.initializeIdPool();
        return this.getUniqueAccId();
      }

      const acc_id = availableIds.shift()!;
      usedIds.push(acc_id);

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
      return this.generateRandomAccId();
    }
  }

  private async generateRandomAccId(): Promise<number> {
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const acc_id = Math.floor(this.ID_MIN + Math.random() * (this.ID_MAX - this.ID_MIN + 1));
      
      const existingUser = await this.getUserByAccId(acc_id);
      
      if (!existingUser) {
        console.log(`Generated random acc_id: ${acc_id}`);
        return acc_id;
      }
    }
    
    throw new UserAccountNoAvailableIDError("Could not generate unique acc_id");
  }

  async returnAccIdToPool(acc_id: number): Promise<void> {
    try {
      const existingUser = await this.getUserByAccId(acc_id);
      if (existingUser) {
        console.log(`Warning: ID ${acc_id} is still in use, not returning to pool`);
        return;
      }

      const poolRef = doc(db, this.idPoolCollection, this.idPoolDoc);
      const poolDoc = await getDoc(poolRef);

      if (poolDoc.exists()) {
        const poolData = poolDoc.data();
        const availableIds = poolData?.available_ids || [];
        const usedIds = poolData?.used_ids || [];

        const updatedUsedIds = usedIds.filter((id: number) => id !== acc_id);
        
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
  // TODO: do we need a get pool contents function? For implementation elsewhere?

  // VALIDATION FUNCTIONS

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

  // AUTHENTICATION FUNCTIONS

  async login(email: string, password: string): Promise<UserData> {
    if (!email || !password) {
      throw new UserAccountFieldEmptyError("Email and password are required");
    }

    if (!this.validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      const userDoc = await getDoc(doc(db, this.usersCollection, uid));
      if (!userDoc.exists()) {
        throw new UserAccountNotFoundError("User profile does not exist");
      }

      const userData = userDoc.data() as Omit<UserData, "uid">;
      
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
        throw new UserAccountLoginMatchError("Invalid email or password");
      }
      
      throw new Error(error.message || "Login failed");
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      console.log("User logged out");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  async registerPhysio(params: {
    name: string;
    email: string;
    password: string;
    licenseNumber: string;
    birthday?: string;
  }): Promise<UserData> {
    if (!params.name || !params.email || !params.password || !params.licenseNumber) {
      throw new UserAccountFieldEmptyError("All fields are required");
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

    if (!this.licenseFormatValid(lic)) {
      throw new PTLicenseValidationError(
        "Invalid license format. Expected format: XX-123456 (e.g., ON-123456)"
      );
    }

    const licenseData = await this.validateLicense(lic);

    const isAlreadyRegistered = await this.isLicenseAlreadyRegistered(lic);
    if (isAlreadyRegistered) {
      throw new PTLicenseValidationError(
        `License number ${lic} is already registered to another user`
      );
    }

    if (await this.emailExists(params.email)) {
      throw new Error("Email already registered");
    }

    const acc_id = await this.getUniqueAccId();

    const cred = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    const uid = cred.user.uid;

    const userData: Omit<UserData, "uid"> = {
      acc_id,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role: "physio",
      licenseNumber: lic,
      verified: true,
      birthday: params.birthday,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.usersCollection, uid), userData);

    console.log(`Physio registered: ${params.name} (License: ${lic}, acc_id: ${acc_id})`);
    
    return { uid, ...userData };
  }

  async registerPatient(params: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
    birthday: string;
  }): Promise<UserData> {
    if (!params.name || !params.email || !params.password || !params.inviteCode || !params.birthday) {
      throw new UserAccountFieldEmptyError("All fields are required");
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

    if (await this.emailExists(params.email)) {
      throw new Error("Email already registered");
    }

    const acc_id = await this.getUniqueAccId();

    const cred = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    const uid = cred.user.uid;

    const userData: Omit<UserData, "uid"> = {
      acc_id,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role: "patient",
      physioId,
      inviteCode: code,
      birthday: params.birthday,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.usersCollection, uid), userData);

    await updateDoc(inviteRef, {
      used: true,
      usedBy: uid,
      usedAt: serverTimestamp(),
    });

    console.log(`Patient registered: ${params.name} (acc_id: ${acc_id})`);
    
    return { uid, ...userData };
  }

  async validateCredentials(email: string, password: string): Promise<boolean> {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (error) {
      return false;
    }
  }

  // USER MANAGEMENT FUNCTIONS

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

  async emailExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  async updateUser(userData: UserData): Promise<boolean> {
    try {
      const existingUser = await this.getUserByAccId(userData.acc_id);
      if (!existingUser) {
        throw new UserAccountNotFoundError(`No user found with acc_id: ${userData.acc_id}`);
      }

      const updateData: Partial<UserData> = {
        name: userData.name,
        email: userData.email,
        birthday: userData.birthday,
        role: userData.role,
        updatedAt: serverTimestamp(),
      };

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

  async deleteUserByAccId(acc_id: number): Promise<boolean> {
    try {
      const user = await this.getUserByAccId(acc_id);
      if (!user) {
        throw new UserAccountNotFoundError(`No user found with acc_id: ${acc_id}`);
      }

      await updateDoc(doc(db, this.usersCollection, user.uid), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });

      await this.returnAccIdToPool(acc_id);

      console.log(`User with acc_id ${acc_id} deleted successfully`);
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
        throw new UserAccountNotFoundError(`No user found with email: ${email}`);
      }

      return await this.deleteUserByAccId(user.acc_id);
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


  // SPECIALIZED FUNCTIONS

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
        throw new UserAccountNotFoundError(`No user found with name: ${name}`);
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
      throw new UserAccountDownloadError(`Failed to download user data: ${error}`);
    }
  }

  async PTaccountDelete(physioEmail: string, patientName: string, patientEmail: string): Promise<void> {
  if (!physioEmail || !patientName || !patientEmail) {
    throw new UserAccountFieldEmptyError("Physio email, patient name, and patient email are required");
  }

  try {
    const physio = await this.getUserByEmail(physioEmail);
    if (!physio) {
      throw new UserAccountNotFoundError(`Physio with email '${physioEmail}' not found`);
    }

    if (physio.role !== "physio") {
      throw new Error("Only physiotherapists can delete patient accounts");
    }
    const usersRef = collection(db, this.usersCollection);
    const q = query(
      usersRef, 
      where("name", "==", patientName), 
      where("email", "==", patientEmail),
      where("role", "==", "patient")
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new UserAccountNotFoundError(
        `No patient found with name '${patientName}' and email '${patientEmail}'`
      );
    }
    const patientsToDelete = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.physioId === physio.uid; // Compare with physio's UID
    });

    if (patientsToDelete.length === 0) {
      throw new Error(
        `Patient '${patientName}' (${patientEmail}) does not belong to physio '${physio.name}'`
      );
    }
    const deletePromises = patientsToDelete.map(async (doc) => {
      const data = doc.data();
      const accId = data.acc_id;

      await updateDoc(doc.ref, {
        deleted: true,
        deletedAt: serverTimestamp(),
      });

      if (accId) {
        await this.returnAccIdToPool(accId);
      }

      console.log(
        `Physio '${physio.name}' deleted patient: ${patientName} (${patientEmail}) with acc_id: ${accId}`
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

// CREATE DEFAULT INSTANCE

const userAccount = new UserAccountService();

// EXPORTS

export default userAccount;