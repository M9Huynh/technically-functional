export const getAuth = jest.fn(() => ({
  currentUser: null,
  signOut: jest.fn(),
}));
export const createUserWithEmailAndPassword = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();