import { saveMetrics, saveSessionData, getUserDisplayName, MetricsData } from '../metricsService';
import { db } from '../firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

jest.mock('../firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(),
    fromMillis: jest.fn()
  },
  doc: jest.fn(),
  getDoc: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn()
}));

describe('metricsService', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  };

  const mockUserData = {
    name: 'Test User'
  };

  const mockMetricsData: MetricsData = {
    angle: 45.6,
    rom_degree: 40.4,
    min_degree: 30.1,
    max_degree: 70.5,
    rep_count: 8,
    rep_state: 'Extension',
    timestamp: 1234567890,
    avg_rep_duration: 1.2,
    current_rep_duration: 0.5
  };

  const mockSessionData = {
    metrics: [mockMetricsData],
    totalReps: 8,
    averageROM: 40.4,
    minAngle: 30.1,
    maxAngle: 70.5,
    startTime: 1234567800,
    endTime: 1234567890,
    avgRepDuration: 1.2
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (getAuth as jest.Mock).mockReturnValue({
      currentUser: mockUser
    });

    (doc as jest.Mock).mockReturnValue('mock-doc-ref');
    
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => mockUserData
    });

    (Timestamp.now as jest.Mock).mockReturnValue({ seconds: 1234567890 });
    (Timestamp.fromMillis as jest.Mock).mockReturnValue({ seconds: 1234567 });

    (collection as jest.Mock).mockReturnValue('mock-collection');
    (addDoc as jest.Mock).mockResolvedValue({ id: 'mock-doc-id' });
  });

  describe('saveMetrics', () => {
    it('should error if user is not logged in', async () => {
      (getAuth as jest.Mock).mockReturnValue({ currentUser: null });

      await expect(saveMetrics(mockMetricsData)).rejects.toThrow('User must be logged in to save metrics');
    });

    it('should error if user document does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      await expect(saveMetrics(mockMetricsData)).rejects.toThrow('User data not found in firebase');
    });

    it('should save metrics', async () => {
      const docId = await saveMetrics(mockMetricsData);

      expect(docId).toBe('mock-doc-id');
      expect(doc).toHaveBeenCalledWith(db, 'users', 'test-user-123');
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(collection).toHaveBeenCalledWith(db, 'activities');
      
      const savedData = (addDoc as jest.Mock).mock.calls[0][1];
      
      expect(savedData).toMatchObject({
        actid: expect.stringContaining('act_'),
        analysis: 'pending',
        exercise: 'Knee Extension',
        target_area: 'knee',
        completed_reps: 8,
        completed_sets: 1,
        max_height: 70.5,
        min_height: 30.1,
        duration: 1,
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        date_performed: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        patient_feedback: '',
        current_angle: 45.6,
        rom_degree: 40.4,
        rep_state: 'Extension',
        avg_rep_duration: 1.2,
        current_rep_duration: 0.5
      });
      
      expect(Timestamp.now).toHaveBeenCalled();
      expect(Timestamp.fromMillis).toHaveBeenCalledWith(1234567890);
    });

    it('should process missing metrics', async () => {
      const minimalMetrics: MetricsData = {
        angle: 45.6,
        rom_degree: 40.4,
        min_degree: 30.1,
        max_degree: 70.5,
        rep_count: 8,
        rep_state: 'Extension',
        timestamp: 1234567890
      };

      await saveMetrics(minimalMetrics);

      const savedData = (addDoc as jest.Mock).mock.calls[0][1];
      
      expect(savedData.avg_rep_duration).toBe(0);
      expect(savedData.current_rep_duration).toBe(0);
      expect(savedData.duration).toBe(0);
    });

    it('should use "Unknown User" if user name not available', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}) // No name field
      });

      await saveMetrics(mockMetricsData);

      const savedData = (addDoc as jest.Mock).mock.calls[0][1];
      expect(savedData.name).toBe('Unknown User');
    });
  });

  describe('saveSessionData', () => {
    it('should error if user is not logged in', async () => {
      (getAuth as jest.Mock).mockReturnValue({ currentUser: null });

      await expect(saveSessionData(mockSessionData)).rejects.toThrow('User must be logged in');
    });

    it('should save session data', async () => {
      const docId = await saveSessionData(mockSessionData);

      expect(docId).toBe('mock-doc-id');
      
      const savedData = (addDoc as jest.Mock).mock.calls[0][1];
      
      expect(savedData).toMatchObject({
        actid: expect.stringContaining('session_'),
        analysis: 'completed',
        completed_reps: 8,
        completed_sets: 1,
        date_performed: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        duration: 1,
        email: 'test@example.com',
        exercise: 'Knee Extension Session',
        max_height: 70.5,
        min_height: 30.1,
        name: 'Test User',
        patient_feedback: '',
        target_area: 'knee',
        uid: 'test-user-123',
        average_rom: 40.4,
        total_reps: 8,
        avg_rep_duration: 1.2
      });
    });

    it('should use session duration when avgRepDuration not provided', async () => {
      const sessionWithoutAvg = {
        ...mockSessionData,
        avgRepDuration: undefined
      };

      await saveSessionData(sessionWithoutAvg);

      const savedData = (addDoc as jest.Mock).mock.calls[0][1];
      
      expect(savedData.duration).toBe(0);
      expect(savedData.avg_rep_duration).toBeUndefined();
    });

    it('should handle missing user data', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      await saveSessionData(mockSessionData);

      const savedData = (addDoc as jest.Mock).mock.calls[0][1];
      expect(savedData.name).toBe('Unknown User');
    });
  });

  describe('getUserDisplayName', () => {
    it('should return user name from firebase', async () => {
      const name = await getUserDisplayName();
      
      expect(name).toBe('Test User');
      expect(doc).toHaveBeenCalledWith(db, 'users', 'test-user-123');
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should return email if name not in firebase', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}) 
      });

      const name = await getUserDisplayName();
      
      expect(name).toBe('test@example.com');
    });

    it('should return "Unknown User" if not logged in', async () => {
      (getAuth as jest.Mock).mockReturnValue({ currentUser: null });

      const name = await getUserDisplayName();
      
      expect(name).toBe('Unknown User');
    });

    it('should return "Unknown User" on error', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('firebase error'));

      const name = await getUserDisplayName();
      
      expect(name).toBe('Unknown User');
    });
  });
});