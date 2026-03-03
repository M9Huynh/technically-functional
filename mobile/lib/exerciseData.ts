import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
  addDoc,
  updateDoc,
} from "firebase/firestore";

export type Exercise = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  demoText?: string; // for now we’ll show demo as text
  enabled: boolean; // only single leg raises should be enabled for now
  tags?: string[];
};

export const RECOMMENDED_EXERCISES: Exercise[] = [
  {
    id: "exercise_demo_vid",
    title: "Seated Knee Flexion-Extension Exercise",
    subtitle: "Recommended #1",
    description:
      "This exercise involves repeatedly bending (flexion) and straightening (extension) the knee joint through a controlled range of motion. It helps improve knee mobility, muscle activation, and functional movement.",
    // demoText: "Demo: (placeholder) Single Leg Raises video/gif goes here",
    enabled: true,
    tags: ["quad", "knee rehab", "beginner"],
  },
  {
    id: "recommended-2",
    title: "Exercise Recommendation #2",
    subtitle: "Recommended #2",
    description:
      "Placeholder exercise. This will be replaced with a real recommendation later.",
    demoText: "Demo: coming soon",
    enabled: false,
    tags: ["coming soon"],
  },
];

export const SIMILAR_EXERCISES: Exercise[] = [
  {
    id: "quad-sets",
    title: "Quad Sets",
    description: "Placeholder similar exercise.",
    enabled: false,
  },
  {
    id: "heel-slides",
    title: "Heel Slides",
    description: "Placeholder similar exercise.",
    enabled: false,
  },
  {
    id: "short-arc-quads",
    title: "Short Arc Quads",
    description: "Placeholder similar exercise.",
    enabled: false,
  },
];

export async function getExercisesById(
  uid: string,
): Promise<Exercise[] | undefined> {
  const db = getFirestore();
  const exerciseCol = collection(db, "userExercises");
  const q = query(exerciseCol, where("userid", "==", uid));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  const docs = querySnapshot.docs.map((doc) => doc.data() as Exercise);
  return docs;
}

export async function getExercise(exid: string): Promise<Exercise | undefined> {
  const db = getFirestore();
  const exerciseCol = collection(db, "userExercises");
  const ex = getDoc(doc(exerciseCol, exid));
  if (!ex) {
    return undefined;
  }
  const ex_data = (await ex).data();
  console.log("Fetched exercise data:", ex_data);
  return ex_data as Exercise;
}

export async function getGeneralExercises(): Promise<Exercise[] | undefined> {
  const db = getFirestore();
  const exerciseCol = collection(db, "exercises");
  const exs = await getDocs(exerciseCol);
  if (exs.empty) {
    console.log("No general exercises found");
    return undefined;
  }
  const docs = exs.docs.map((doc) => doc.data() as Exercise);
  //console.log("Fetched general exercises:", docs);
  return docs;
}

export async function getSelectedExercises(
  uid: string,
): Promise<Exercise[] | undefined> {
  const db = getFirestore();
  const exerciseCol = collection(db, "userExercises");
  const q = query(exerciseCol, where("userid", "==", uid));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  const exercises = querySnapshot.docs.map((doc) => doc.data() as Exercise);
  console.log("Selected exercises for user", uid, ":", exercises);
  return exercises;
}

export async function removeUserExercise(
  uid: string,
  exerciseTitle: string,
): Promise<void> {
  const db = getFirestore();
  const exerciseCol = collection(db, "userExercises");
  const q = query(
    exerciseCol,
    where("userid", "==", uid),
    where("title", "==", exerciseTitle),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log(
      "No matching exercise found for user",
      uid,
      "and exercise",
      exerciseTitle,
    );
    return;
  }
  const docRef = querySnapshot.docs[0].ref;
  await deleteDoc(docRef);
}

export async function addUserExercise(
  uid: string,
  exercise: Exercise,
): Promise<void> {
  const db = getFirestore();
  const exerciseCol = collection(db, "userExercises");
  const doc = await addDoc(exerciseCol, {
    userid: uid,
  });
  await updateDoc(doc, {
    title: exercise.title,
    description: exercise.description,
    id: doc.id,
  });
}

export async function updateUserExercise(
  uid: string,
  exerciseTitle: string,
  exerciseDescription: string): Promise<void> {
  const db = getFirestore();
  const exerciseCol = collection(db, "userExercises");
  const q = query(
    exerciseCol,
    where("userid", "==", uid),
    where("title", "==", exerciseTitle),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log(
      "No matching exercise found for user",
      uid,
      "and exercise",
      exerciseTitle,
    );
    return;
  }
  const docRef = querySnapshot.docs[0].ref;
  await updateDoc(docRef, {
    title: exerciseTitle,
    description: exerciseDescription,
    //enabled: exercise.enabled,
    //tags: exercise.tags || [],
  });
}