import { db } from './firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// defines the structure of the metrics data returned from the backend
export interface MetricsData {
  angle: number;
  rom_degree: number;
  min_degree: number;
  max_degree: number;
  rep_count: number;
  rep_state: string;
  timestamp: number;
  avg_rep_duration?: number;
  current_rep_duration?: number; 
}

export const saveMetrics = async (metricsData: MetricsData) => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User must be logged in to save metrics');
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User data not found in Firestore');
    }
    
    const userData = userDoc.data();
    
    const duration = metricsData.avg_rep_duration || 0;
    
    const firestoreData = {
      actid: `act_${Date.now()}`, 
      analysis: "pending", 
      
      // Exercise information
      exercise: "Knee Extension",
      target_area: "knee",
      
      completed_reps: metricsData.rep_count || 0,
      completed_sets: 1,

      // Max/Min Angle data 
      max_height: metricsData.max_degree || 0,
      min_height: metricsData.min_degree || 0,
      
      // Session data
      duration: Math.round(duration),    

      uid: user.uid,
      email: user.email || "",
      name: userData?.name || "Unknown User",
      
      // Date "YYYY-MM-DD"
      date_performed: new Date().toISOString().split('T')[0], 
      
      // Feedback
      patient_feedback: "", 
      
      current_angle: metricsData.angle,
      rom_degree: metricsData.rom_degree,
      rep_state: metricsData.rep_state,
      
      avg_rep_duration: metricsData.avg_rep_duration || 0,
      current_rep_duration: metricsData.current_rep_duration || 0,
      
      // Timestamps
      createdAt: Timestamp.now(),
      timestamp: Timestamp.fromMillis(metricsData.timestamp),
    };
    

    const activitiesRef = collection(db, 'activities');
    const docRef = await addDoc(activitiesRef, firestoreData);

    return docRef.id;
};

export const saveSessionData = async (sessionData: {
  metrics: MetricsData[];
  totalReps: number;
  averageROM: number;
  minAngle: number;
  maxAngle: number;
  startTime: number;
  endTime: number;
  avgRepDuration?: number; 
}) => {

    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User must be logged in');
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Calculate session duration in seconds
    const sessionDuration = Math.floor((sessionData.endTime - sessionData.startTime) / 1000);
    
    // Use avg_rep_duration if provided, otherwise use session duration
    const duration = sessionData.avgRepDuration || sessionDuration;
    
    const firestoreData = {
      actid: `session_${Date.now()}`,
      analysis: "completed",
      completed_reps: sessionData.totalReps,
      completed_sets: 1,
      date_performed: new Date().toISOString().split('T')[0],
      duration: Math.round(duration),
      email: user.email || "",
      exercise: "Knee Extension Session",
      max_height: sessionData.maxAngle,
      min_height: sessionData.minAngle,
      name: userData?.name || "Unknown User",
      patient_feedback: "",
      target_area: "knee",
      uid: user.uid,
      
      average_rom: sessionData.averageROM,
      total_reps: sessionData.totalReps,
      
      ...(sessionData.avgRepDuration && { avg_rep_duration: sessionData.avgRepDuration }),
      
      createdAt: Timestamp.now(),
    };
    
    const activitiesRef = collection(db, 'activities');
    const docRef = await addDoc(activitiesRef, firestoreData);
    

    return docRef.id;

};

export const getUserDisplayName = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) return "Unknown User";
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data().name || user.email || "Unknown User";
    }
    
    return user.email || "Unknown User";
  } catch (error) {
    console.error('Error getting user name:', error);
    return "Unknown User";
  }
};