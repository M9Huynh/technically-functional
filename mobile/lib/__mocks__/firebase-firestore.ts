export const getFirestore = jest.fn(() => ({
  type: 'firestore',
}));
export const doc = jest.fn((_db: any, collection: string, id: string) => ({
  __ref: true,
  collection,
  id,
}));

export const addDoc = jest.fn();
export const getDoc = jest.fn();
export const getDocs = jest.fn();
export const setDoc = jest.fn();
export const updateDoc = jest.fn();
export const serverTimestamp = jest.fn(() => "__SERVER_TIMESTAMP__");
export const collection = jest.fn();
export const query = jest.fn();
export const where = jest.fn();