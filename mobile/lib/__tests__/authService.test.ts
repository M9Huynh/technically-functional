// Mock local firebase file so real initializeApp never runs
jest.mock("../firebase", () => ({
  auth: {},
  db: {},
}));

import {
  registerPhysio,
  registerPatient,
  login,
  licenseFormatValid,
} from "../authService";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

function snap(exists: boolean, dataObj?: any) {
  return {
    exists: () => exists,
    data: () => dataObj,
  };
}

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------
  // License Validation
  // -------------------
  it("validates license format", () => {
    expect(licenseFormatValid("ON-123456")).toBe(true);
    expect(licenseFormatValid("on-123456")).toBe(true);
    expect(licenseFormatValid("BAD")).toBe(false);
  });

  // -------------------
  // Login (isValidUser behavior)
  // -------------------
  it("throws if user profile missing", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: "123" },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce(snap(false));

    await expect(login("test@test.com", "pw"))
      .rejects.toThrow("User profile missing in Firestore.");
  });

  it("returns physio user data", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: "phys1" },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { role: "physio", name: "Dr A" })
    );

    const result = await login("x", "y");

    expect(result).toEqual({
      uid: "phys1",
      role: "physio",
      name: "Dr A",
    });
  });

  it("returns patient user data", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: "pat1" },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { role: "patient", name: "Pat A" })
    );

    const result = await login("x", "y");

    expect(result).toEqual({
      uid: "pat1",
      role: "patient",
      name: "Pat A",
    });
  });

  // -------------------
  // registerPhysio
  // -------------------
  it("creates physio account when license valid", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { active: true })
    );

    (createUserWithEmailAndPassword as jest.Mock)
      .mockResolvedValueOnce({ user: { uid: "newPhysio" } });

    await registerPhysio({
      name: "Dr Test",
      email: "dr@test.com",
      password: "pw",
      licenseNumber: "ON-123456",
    });

    expect(setDoc).toHaveBeenCalled();
  });

  // -------------------
  // registerPatient
  // -------------------
  it("creates patient and marks invite used", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, {
        active: true,
        used: false,
        physioId: "phys1",
      })
    );

    (createUserWithEmailAndPassword as jest.Mock)
      .mockResolvedValueOnce({ user: { uid: "newPatient" } });

    await registerPatient({
      name: "Pat",
      email: "pat@test.com",
      password: "pw",
      inviteCode: "abcd",
    });

    expect(setDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
  });
});