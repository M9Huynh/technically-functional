// IMPORTANT: mock local firebase.ts FIRST so initializeApp/env never runs
jest.mock("../firebase", () => ({
  auth: {},
  db: {},
}));

import {
  registerPhysio,
  registerPatient,
  login,
  logout,
  licenseFormatValid,
} from "../authService";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// Fake Firestore DocumentSnapshot
function snap(exists: boolean, dataObj?: any) {
  return {
    exists: () => exists,
    data: () => dataObj,
  };
}

describe("authService - tests in table order", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------
  // Supporting validation (licenseFormatValid helper)
  // ------------------------------------------------------------
  it("TC-HELP1: validates license format helper", () => {
    expect(licenseFormatValid("ON-123456")).toBe(true);
    expect(licenseFormatValid("on-123456")).toBe(true);
    expect(licenseFormatValid(" BAD ")).toBe(false);
  });

  // ============================================================
  // Account Creation Module Test Cases (TC-AC1 ... TC-AC8)
  // ============================================================

  it("TC-AC1: Register Physio with valid license (creates user + writes correct Firestore data)", async () => {
    // 1) validLicenses check passes
    (getDoc as jest.Mock).mockResolvedValueOnce(snap(true, { active: true }));

    // 2) Auth create returns uid
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "newPhysio" },
    });

    await registerPhysio({
      name: "  Dr Test  ",
      email: "  DR@TEST.COM  ",
      password: "pw",
      licenseNumber: "on-123456",
    });

    // Assert Firestore write happened to users/newPhysio with normalized fields
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", id: "newPhysio" }),
      expect.objectContaining({
        role: "physio",
        name: "Dr Test",
        email: "dr@test.com",
        licenseNumber: "ON-123456",
        verified: true,
        createdAt: "__SERVER_TIMESTAMP__",
      })
    );
  });

  it("TC-AC2: Register Physio with invalid license format (throws, no Auth, no Firestore write)", async () => {
    await expect(
      registerPhysio({
        name: "Dr Test",
        email: "dr@test.com",
        password: "pw",
        licenseNumber: "BADFORMAT",
      })
    ).rejects.toThrow("Invalid license format (example: ON-123456).");

    expect(getDoc).not.toHaveBeenCalled(); // stops before DB allowlist check
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("TC-AC3: Register Physio with unverified license (throws, no Auth, no Firestore write)", async () => {
    // validLicenses lookup fails or inactive
    (getDoc as jest.Mock).mockResolvedValueOnce(snap(true, { active: false }));

    await expect(
      registerPhysio({
        name: "Dr Test",
        email: "dr@test.com",
        password: "pw",
        licenseNumber: "ON-123456",
      })
    ).rejects.toThrow("License not verified.");

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("TC-AC4: Register Patient with valid invite (creates user + writes profile + marks invite used)", async () => {
    // 1) inviteCodes lookup passes
    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { active: true, used: false, physioId: "phys1" })
    );

    // 2) Auth create returns uid
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "newPatient" },
    });

    await registerPatient({
      name: "  Pat  ",
      email: "  PAT@TEST.COM ",
      password: "pw",
      inviteCode: " abcd ",
    });

    // Assert user profile written
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", id: "newPatient" }),
      expect.objectContaining({
        role: "patient",
        name: "Pat",
        email: "pat@test.com",
        physioId: "phys1",
        inviteCode: "ABCD",
        createdAt: "__SERVER_TIMESTAMP__",
      })
    );

    // Assert invite marked used with correct uid
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "inviteCodes", id: "ABCD" }),
      { used: true, usedBy: "newPatient" }
    );
  });

  it("TC-AC5: Register Patient with invalid invite (throws, no Auth, no Firestore write/update)", async () => {
    // inviteCodes lookup: does not exist
    (getDoc as jest.Mock).mockResolvedValueOnce(snap(false));

    await expect(
      registerPatient({
        name: "Pat",
        email: "pat@test.com",
        password: "pw",
        inviteCode: "ABCD",
      })
    ).rejects.toThrow("Invalid invite code.");

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("TC-AC6: Register Patient with inactive invite (throws, no Auth, no Firestore write/update)", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { active: false, used: false, physioId: "phys1" })
    );

    await expect(
      registerPatient({
        name: "Pat",
        email: "pat@test.com",
        password: "pw",
        inviteCode: "ABCD",
      })
    ).rejects.toThrow("Invite code inactive.");

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("TC-AC7: Register Patient with already-used invite (throws, no Auth, no Firestore write/update)", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { active: true, used: true, physioId: "phys1" })
    );

    await expect(
      registerPatient({
        name: "Pat",
        email: "pat@test.com",
        password: "pw",
        inviteCode: "ABCD",
      })
    ).rejects.toThrow("Invite code already used.");

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("TC-AC8: Register Patient missing physio link (throws, no Auth, no Firestore write/update)", async () => {
    // physioId missing
    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { active: true, used: false })
    );

    await expect(
      registerPatient({
        name: "Pat",
        email: "pat@test.com",
        password: "pw",
        inviteCode: "ABCD",
      })
    ).rejects.toThrow("Invite code missing physio link.");

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ============================================================
  // Valid User Module Test Cases (TC-VU1 ... TC-VU4)
  // ============================================================

  it("TC-VU1: Login valid physio (returns uid + Firestore profile)", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "phys1" },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { role: "physio", name: "Dr A", email: "dr@test.com" })
    );

    const result = await login("dr@test.com", "pw");

    expect(result).toEqual({
      uid: "phys1",
      role: "physio",
      name: "Dr A",
      email: "dr@test.com",
    });
  });

  it("TC-VU2: Login valid patient (returns uid + Firestore profile)", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "pat1" },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce(
      snap(true, { role: "patient", name: "Pat A", physioId: "phys1" })
    );

    const result = await login("pat@test.com", "pw");

    expect(result).toEqual({
      uid: "pat1",
      role: "patient",
      name: "Pat A",
      physioId: "phys1",
    });
  });

  it("TC-VU3: Login missing Firestore profile (throws)", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: "123" },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce(snap(false));

    await expect(login("test@test.com", "pw")).rejects.toThrow(
      "User profile missing in Firestore."
    );
  });

  it("TC-VU4: Logout calls signOut once", async () => {
    (signOut as jest.Mock).mockResolvedValueOnce(undefined);

    await logout();

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});