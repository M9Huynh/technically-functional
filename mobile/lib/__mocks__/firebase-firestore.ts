export const doc = jest.fn((_db: any, collection: string, id: string) => ({
  __ref: true,
  collection,
  id,
}));

export const getDoc = jest.fn();
export const setDoc = jest.fn();
export const updateDoc = jest.fn();
export const serverTimestamp = jest.fn(() => "__SERVER_TIMESTAMP__");