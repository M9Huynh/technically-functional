// lib/__tests__/userAccount.test.ts
import { UserAccountService } from '../userAccount';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Mock Firebase modules
jest.mock('../firebase', () => ({
  auth: {},
  db: {}
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date('2024-01-01T00:00:00Z')),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

describe('UserAccountService', () => {
  let userService: UserAccountService;

  // Mock data
  const mockUserData = {
    email: 'test@example.com',
    name: 'Test User',
    role: 'patient' as const,
    birthday: '1990-01-01',
  };

  const mockFirebaseUser = {
    uid: 'test-uid-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserAccountService();
  });

  describe('User Management', () => {
    test('getUserData should return user data for valid uid', async () => {
      (doc as jest.Mock).mockReturnValue('user-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });

      const result = await userService.getUserData('test-uid');

      expect(result).toEqual({
        uid: 'test-uid',
        ...mockUserData,
      });
    });

    test('getUserData should return null for non-existent user', async () => {
      (doc as jest.Mock).mockReturnValue('user-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await userService.getUserData('test-uid');
      expect(result).toBeNull();
    });

    test('getUserData should throw for empty uid', async () => {
      await expect(userService.getUserData('')).rejects.toThrow('UID is required');
    });

    test('getUserByEmail should return user for valid email', async () => {
      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{
          id: 'test-uid',
          data: () => mockUserData,
        }],
      });

      const result = await userService.getUserByEmail('test@example.com');
      expect(result).toEqual({
        uid: 'test-uid',
        ...mockUserData,
      });
    });

    test('getUserByEmail should return null for non-existent email', async () => {
      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
      });

      const result = await userService.getUserByEmail('test@example.com');
      expect(result).toBeNull();
    });

    test('emailExists should return true for existing email', async () => {
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue({
        uid: 'test-uid',
        ...mockUserData,
      });

      const result = await userService.emailExists('test@example.com');
      expect(result).toBe(true);
    });

    test('emailExists should return false for non-existent email', async () => {
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(null);

      const result = await userService.emailExists('test@example.com');
      expect(result).toBe(false);
    });

    test('updateUser should succeed for valid uid', async () => {
      jest.spyOn(userService, 'getUserData').mockResolvedValue({
        uid: 'test-uid',
        ...mockUserData,
      });

      (doc as jest.Mock).mockReturnValue('user-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updates = { name: 'Updated Name' };
      const result = await userService.updateUser('test-uid', updates);

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith('user-doc-ref', {
        name: 'Updated Name',
        updatedAt: expect.any(Date),
      });
    });

    test('updateUser should return false for non-existent user', async () => {
      jest.spyOn(userService, 'getUserData').mockResolvedValue(null);

      const result = await userService.updateUser('test-uid', { name: 'New Name' });
      expect(result).toBe(false);
    });

    test('deleteUser should succeed for valid uid', async () => {
      (doc as jest.Mock).mockReturnValue('user-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await userService.deleteUser('test-uid');

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith('user-doc-ref', {
        deleted: true,
        deletedAt: expect.any(Date),
      });
    });

    test('deleteUser should return false for non-existent user', async () => {
      (doc as jest.Mock).mockReturnValue('user-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await userService.deleteUser('test-uid');
      expect(result).toBe(false);
    });

    test('deleteUserByEmail should succeed for valid email', async () => {
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue({
        uid: 'test-uid',
        ...mockUserData,
      });

      jest.spyOn(userService, 'deleteUser').mockResolvedValue(true);

      const result = await userService.deleteUserByEmail('test@example.com');
      expect(result).toBe(true);
      expect(userService.deleteUser).toHaveBeenCalledWith('test-uid');
    });

    test('deleteUserByEmail should return false for non-existent email', async () => {
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(null);

      const result = await userService.deleteUserByEmail('test@example.com');
      expect(result).toBe(false);
    });
  });

  describe('Query Functions', () => {
    test('getPatientsByPhysio should return patients for valid physioId', async () => {
      const mockPatients = [
        { id: 'patient-1', data: () => ({ name: 'Patient 1', role: 'patient', physioId: 'physio-1' }) },
        { id: 'patient-2', data: () => ({ name: 'Patient 2', role: 'patient', physioId: 'physio-1' }) },
      ];

      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        forEach: (callback: any) => mockPatients.forEach(callback),
        docs: mockPatients,
      });

      const result = await userService.getPatientsByPhysio('physio-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        uid: 'patient-1',
        name: 'Patient 1',
        role: 'patient',
        physioId: 'physio-1',
      });
    });

    test('getPatientsByPhysio should return empty array on error', async () => {
      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const result = await userService.getPatientsByPhysio('physio-1');
      expect(result).toEqual([]);
    });

    test('getUsersByName should return matching users', async () => {
      const mockUsers = [
        { id: 'user-1', data: () => ({ name: 'John Doe', role: 'patient' }) },
        { id: 'user-2', data: () => ({ name: 'John Smith', role: 'physio' }) },
        { id: 'user-3', data: () => ({ name: 'Jane Doe', role: 'patient' }) },
      ];

      (collection as jest.Mock).mockReturnValue('users-collection');
      (getDocs as jest.Mock).mockResolvedValue({
        forEach: (callback: any) => mockUsers.forEach(callback),
        docs: mockUsers,
      });

      const result = await userService.getUsersByName('John');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('John Smith');
    });

    test('getAllUsers should return all users', async () => {
      const mockUsers = [
        { id: 'user-1', data: () => ({ name: 'User 1', role: 'patient' }) },
        { id: 'user-2', data: () => ({ name: 'User 2', role: 'physio' }) },
        { id: 'user-3', data: () => ({ name: 'User 3', role: 'patient' }) },
      ];

      (collection as jest.Mock).mockReturnValue('users-collection');
      (getDocs as jest.Mock).mockResolvedValue({
        forEach: (callback: any) => mockUsers.forEach(callback),
        docs: mockUsers,
      });

      const result = await userService.getAllUsers();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('User 1');
      expect(result[1].name).toBe('User 2');
      expect(result[2].name).toBe('User 3');
    });
  });

  describe('Specialized Functions', () => {
    test('getUserdbInfo should return categorized users', async () => {
      const mockUsers = [
        { id: 'user-1', data: () => ({ name: 'John Doe', role: 'patient', birthday: '1990-01-01' }) },
        { id: 'user-2', data: () => ({ name: 'John Doe', role: 'physio', birthday: '1980-01-01' }) },
      ];

      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        forEach: (callback: any) => mockUsers.forEach(callback),
        docs: mockUsers,
      });

      const result = await userService.getUserdbInfo('John Doe');

      expect(result.patients).toHaveLength(1);
      expect(result.physios).toHaveLength(1);
      expect(result.patients[0].name).toBe('John Doe');
      expect(result.patients[0].role).toBe('patient');
      expect(result.physios[0].name).toBe('John Doe');
      expect(result.physios[0].role).toBe('physio');
    });

    test('getUserdbInfo should filter by birthday', async () => {
      const mockUsers = [
        { id: 'user-1', data: () => ({ name: 'John Doe', role: 'patient', birthday: '1990-01-01' }) },
      ];

      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        forEach: (callback: any) => mockUsers.forEach(callback),
        docs: mockUsers,
      });

      const result = await userService.getUserdbInfo('John Doe', '1990-01-01');

      expect(result.patients).toHaveLength(1);
      expect(result.physios).toHaveLength(0);
    });

    test('PTaccountDelete should delete patient accounts', async () => {
      // Mock physio lookup
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValueOnce({
        uid: 'physio-uid',
        email: 'physio@example.com',
        name: 'Dr. Physio',
        role: 'physio',
        birthday: '1980-01-01',
      });

      // Mock patient query
      const mockPatientDoc = {
        ref: 'patient-ref',
        id: 'patient-uid',
        data: () => ({
          name: 'John Doe',
          email: 'john@example.com',
          role: 'patient',
          physioId: 'physio-uid',
          birthday: '1990-01-01',
        }),
      };

      (collection as jest.Mock).mockReturnValue('users-collection');
      (query as jest.Mock).mockReturnValue('users-query');
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [mockPatientDoc],
      });

      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await userService.PTaccountDelete(
        'physio@example.com',
        'John Doe',
        'john@example.com'
      );

      expect(updateDoc).toHaveBeenCalledWith('patient-ref', {
        deleted: true,
        deletedAt: expect.any(Date),
      });
    });

    test('PTaccountDelete should throw for non-physio', async () => {
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValueOnce({
        uid: 'patient-uid',
        email: 'patient@example.com',
        name: 'John Patient',
        role: 'patient',
        birthday: '1990-01-01',
      });

      await expect(userService.PTaccountDelete(
        'patient@example.com',
        'John Doe',
        'john@example.com'
      )).rejects.toThrow('Only physiotherapists can delete patient accounts');
    });
test('deleteUserByEmail should return false for non-existent email', async () => {
  jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(null);

  const result = await userService.deleteUserByEmail('test@example.com');
  expect(result).toBe(false);
});

test('usernamePwMatch should throw for non-existent user', async () => {
  jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(null);

  await expect(userService.usernamePwMatch('nonexistent@example.com', 'password123')).rejects.toThrow(
    'Authentication failed'
  );
});

    test('usernamePwMatch should throw for invalid credentials', async () => {
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue({
        uid: 'test-uid',
        ...mockUserData,
      });

      jest.spyOn(userService, 'validateCredentials').mockResolvedValue(false);

      await expect(userService.usernamePwMatch('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Authentication failed'
      );
    });

    test('authenticateUser should return user for valid credentials', async () => {
      const mockUser = {
        uid: 'test-uid',
        ...mockUserData,
      };

      jest.spyOn(userService, 'usernamePwMatch').mockResolvedValue(true);
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(mockUser);

      const result = await userService.authenticateUser('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    test('authenticateUser should return null for invalid credentials', async () => {
      jest.spyOn(userService, 'usernamePwMatch').mockRejectedValue(new Error('Auth failed'));

      const result = await userService.authenticateUser('test@example.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    test('initializeSystem should log success message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await userService.initializeSystem();
      
      expect(consoleSpy).toHaveBeenCalledWith('System initialized successfully');
      consoleSpy.mockRestore();
    });
  });

  describe('Validation Helpers', () => {
    test('validateCredentials should return true for valid credentials', async () => {
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockFirebaseUser,
      });

      const result = await userService.validateCredentials('test@example.com', 'password123');
      expect(result).toBe(true);
    });

    test('validateCredentials should return false for invalid credentials', async () => {
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(new Error('Auth failed'));

      const result = await userService.validateCredentials('test@example.com', 'wrongpassword');
      expect(result).toBe(false);
    });
  });
});