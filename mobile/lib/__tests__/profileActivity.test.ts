import {
  clearSelectedUserID,
  exerciseChartData,
  getComments,
  getCurrentUser,
  getCurrentUserID,
  getName,
  getPhysioInviteCode,
  getSelectedUser,
  getSelectedUserID,
  getUserActivities,
  getUserSummary,
  postComment,
  repsChartData,
  setSelectedUserID,
} from "../profileActivity";
import { auth } from "../firebase";
import {
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  collection,
  where,
  query,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserAccountService } from "../useraccount";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const snap = (exists: boolean, data?: any) => ({
  exists: () => exists,
  data: () => data,
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (auth.currentUser as any) = null;
  });

  it("TC105: Should return the current user", async () => {
    const user = { uid: "user123" };
    (auth.currentUser as any) = user;
    (getDoc as jest.Mock).mockResolvedValueOnce(snap(true, user));

    const result = await getCurrentUser();

    expect(result).toEqual(user);
  });

  it("TC106: Should return null if no current user is found", async () => {
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("TC107: Should return null if user document does not exist", async () => {
    const user = { uid: "user123" };
    (auth.currentUser as any) = user;
    (getDoc as jest.Mock).mockResolvedValueOnce(snap(false, user));

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });

  it("TC108: Should return null on Firestore error", async () => {
    const user = { uid: "user123" };
    (auth.currentUser as any) = user;
    (getDoc as jest.Mock).mockRejectedValueOnce(new Error("Firestore error"));

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });
});

describe("getCurrentUserID", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (auth.currentUser as any) = null;
  });

  it("TC109: Should return the current user's UID", async () => {
    const user = { uid: "user123" };
    (auth.currentUser as any) = user;

    const result = await getCurrentUserID();

    expect(result).toBe("user123");
  });

  it("TC110: Should return null if no current user is found", async () => {
    const result = await getCurrentUserID();
    expect(result).toBeNull();
  });
});

describe("getUserActivities", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC111: Empty Array with No Activities (calls getDocs)", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn(),
    });

    const result = await getUserActivities("user123");

    expect(result).toEqual([]);
    expect(getDocs).toHaveBeenCalled();
  });

  it("TC112: Should return activities sorted by date in descending order", async () => {
    const mockActivities = [
      { id: "1", uid: "user123", date_performed: "2024-01-01" },
      { id: "2", uid: "user123", date_performed: "2024-01-03" },
      { id: "3", uid: "user123", date_performed: "2024-01-02" },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn((callback) => {
        mockActivities.forEach((activity) => {
          callback({ data: () => activity });
        });
      }),
    });

    const result = await getUserActivities("user123");

    expect(result).toHaveLength(3);
    expect(result[0].date_performed).toBe("2024-01-03");
    expect(result[1].date_performed).toBe("2024-01-02");
    expect(result[2].date_performed).toBe("2024-01-01");
  });

  it("TC113: Should return empty array on error", async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error("Firestore error"));

    const result = await getUserActivities("user123");

    expect(result).toEqual([]);
  });

  it("TC114: Should query activities for the correct uid", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn(),
    });

    await getUserActivities("testuid123");

    expect(getDocs).toHaveBeenCalled();
  });
});

describe("getUserSummary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC115: Should return correct summary data", async () => {
    const mockActivities = [
      {
        id: "1",
        uid: "user123",
        date_performed: new Date(),
      },
      {
        id: "2",
        uid: "user123",
        date_performed: new Date(Date.now() - 86400000),
      },
      {
        id: "3",
        uid: "user123",
        date_performed: new Date(Date.now() - 2 * 86400000),
      },
    ];

    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        // First call: activities
        forEach: jest.fn((callback) => {
          mockActivities.forEach((activity) => {
            callback({ data: () => activity });
          });
        }),
      })
      .mockResolvedValueOnce({
        // Second call: comments
        size: 2,
      });

    const result = await getUserSummary("user123");

    expect(result.totalActivities).toBe(3);
    expect(result.totalComments).toBe(2);
    expect(result.streak).toBe(3);
    expect(result.today).toBe(1);
  });

  it("TC116: Should return zero summary for user with no activities or comments", async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        // First call: activities
        forEach: jest.fn(),
      })
      .mockResolvedValueOnce({
        // Second call: comments
        size: 0,
      });

    const result = await getUserSummary("user123");

    expect(result.totalActivities).toBe(0);
    expect(result.totalComments).toBe(0);
    expect(result.streak).toBe(0);
    expect(result.today).toBe(0);
  });

  it("TC117: Should handle errors gracefully", async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error("Firestore error"));

    const result = await getUserSummary("user123");

    expect(result.totalActivities).toBe(0);
    expect(result.totalComments).toBe(0);
    expect(result.streak).toBe(0);
    expect(result.today).toBe(0);
  });
});

describe("repsChartData", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC118: Should return correct reps chart data", async () => {
    const mockActivities = [
      {
        id: "1",
        uid: "user123",
        completed_reps: 10,
        date_performed: new Date().toLocaleDateString("en-CA"),
      },
      {
        id: "2",
        uid: "user123",
        completed_reps: 12,
        date_performed: new Date(Date.now() - 86400000)
          .toLocaleDateString("en-CA"),
      },
      {
        id: "3",
        uid: "user123",
        completed_reps: 8,
        date_performed: new Date(Date.now() - 2 * 86400000)
          .toLocaleDateString("en-CA"),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn((callback) => {
        mockActivities.forEach((activity) => {
          callback({ data: () => activity });
        });
      }),
    });

    const result = await repsChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 10 },
      { label: expect.any(String), value: 12 },
      { label: expect.any(String), value: 8 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC119: Should return correct reps chart data with duplicate dates", async () => {
    const mockActivities = [
      {
        id: "1",
        uid: "user123",
        completed_reps: 10,
        date_performed: new Date().toLocaleDateString("en-CA"),
      },
      {
        id: "2",
        uid: "user123",
        completed_reps: 12,
        date_performed: new Date(Date.now()).toLocaleDateString("en-CA"),
      },
      {
        id: "3",
        uid: "user123",
        completed_reps: 8,
        date_performed: new Date(Date.now() - 2 * 86400000)
          .toLocaleDateString("en-CA"),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn((callback) => {
        mockActivities.forEach((activity) => {
          callback({ data: () => activity });
        });
      }),
    });

    const result = await repsChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 22 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 8 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC120: Should return empty reps chart data when 0 reps", async () => {
    const mockActivities = [
      {
        id: "1",
        uid: "user123",
        completed_reps: 0,
        date_performed: new Date().toISOString().split("T")[0],
      },
      {
        id: "2",
        uid: "user123",
        completed_reps: 0,
        date_performed: new Date(Date.now() - 86400000)
          .toISOString()
          .split("T")[0],
      },
      {
        id: "3",
        uid: "user123",
        completed_reps: 0,
        date_performed: new Date(Date.now() - 2 * 86400000)
          .toISOString()
          .split("T")[0],
      },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn((callback) => {
        mockActivities.forEach((activity) => {
          callback({ data: () => activity });
        });
      }),
    });

    const result = await repsChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC121: Should return empty reps chart data with no activities", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn(),
    });

    const result = await repsChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC122: Should handle errors gracefully", async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to fetch activities"),
    );

    const result = await repsChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });
});

describe("exerciseChartData", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC123: Should return correct exercise chart data", async () => {
    const mockActivities = [
      {
        id: "1",
        uid: "user123",
        completed_reps: 10,
        date_performed: new Date().toLocaleDateString("en-CA"),
      },
      {
        id: "2",
        uid: "user123",
        completed_reps: 12,
        date_performed: new Date(Date.now() - 86400000)
          .toLocaleDateString("en-CA"),
      },
      {
        id: "3",
        uid: "user123",
        completed_reps: 8,
        date_performed: new Date(Date.now() - 2 * 86400000)
          .toLocaleDateString("en-CA"),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn((callback) => {
        mockActivities.forEach((activity) => {
          callback({ data: () => activity });
        });
      }),
    });

    const result = await exerciseChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 1 },
      { label: expect.any(String), value: 1 },
      { label: expect.any(String), value: 1 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC124: Should return empty exercise chart data with duplicate dates", async () => {
    const mockActivities = [
      {
        id: "1",
        uid: "user123",
        completed_reps: 10,
        date_performed: new Date().toLocaleDateString("en-CA"),
      },
      {
        id: "2",
        uid: "user123",
        completed_reps: 12,
        date_performed: new Date(Date.now() - 2 * 86400000)
          .toLocaleDateString("en-CA"),
      },
      {
        id: "3",
        uid: "user123",
        completed_reps: 8,
        date_performed: new Date(Date.now() - 2 * 86400000)
          .toLocaleDateString("en-CA"),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn((callback) => {
        mockActivities.forEach((activity) => {
          callback({ data: () => activity });
        });
      }),
    });

    const result = await exerciseChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 1 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 2 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC125: Should return empty exercise chart data with no activities", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: jest.fn(),
    });

    const result = await exerciseChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });

  it("TC126: Should handle errors gracefully", async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to fetch activities"),
    );

    const result = await exerciseChartData("user123");

    expect(result).toEqual([
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
      { label: expect.any(String), value: 0 },
    ]);
  });
});

describe("getComments", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC127: Should return comments for a given activity ID", async () => {
    const mockComments = [
      { id: "c1", actid: "a1", text: "Great job!" },
      { id: "c2", actid: "a1", text: "Keep it up!" },
    ];

    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: mockComments.map((comment) => ({
        data: () => comment,
      })),
    });

    const result = await getComments("a1");

    expect(result).toEqual(mockComments);
  });

  it("TC128: Should return an empty array if no comments are found", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [],
    });

    const result = await getComments("a1");

    expect(result).toEqual([]);
  });

  it("TC129: Should handle errors gracefully", async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to fetch comments"),
    );

    const result = await getComments("a1");

    expect(result).toEqual([]);
  });
});

describe("postComment", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC130: Should post a comment with correct data", async () => {
    const mockDocRef = { id: "c1" };
    const mockUserDoc = {
      exists: () => true,
      data: () => ({ name: "Test User" }),
    };

    (getDoc as jest.Mock).mockResolvedValueOnce(mockUserDoc);
    (collection as jest.Mock).mockReturnValue("commentsRef");
    (addDoc as jest.Mock).mockResolvedValueOnce(mockDocRef);
    (setDoc as jest.Mock).mockResolvedValueOnce(undefined);

    await postComment("a1", "user123", "Great job!");

    expect(collection).toHaveBeenCalledWith(expect.anything(), "comments");

    expect(addDoc).toHaveBeenCalledWith("commentsRef", {
      actid: "a1",
    });

    expect(setDoc).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        cid: "c1",
        actid: "a1",
        uid: "user123",
        comment: "Great job!",
        author: "Test User",
      }),
    );
  });

  it("TC131: Should not post an empty comment", async () => {
    await postComment("a1", "user123", "");
    expect(collection).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("TC132: Should handle errors gracefully", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: "Test User" }),
    });
    (collection as jest.Mock).mockReturnValue("commentsRef");
    (addDoc as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to add comment"),
    );
    (setDoc as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to set comment"),
    );

    await postComment("a1", "user123", "Great job!");

    expect(collection).toHaveBeenCalledWith(expect.anything(), "comments");
    expect(addDoc).toHaveBeenCalledWith("commentsRef", {
      actid: "a1",
    });
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe("getName", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC133: Should return the user's name", async () => {
    const mockUserDoc = {
      exists: () => true,
      data: () => ({ name: "Test User" }),
    };

    (getDoc as jest.Mock).mockResolvedValueOnce(mockUserDoc);

    const result = await getName("user123");

    expect(result).toEqual("Test User");
  });

  it("TC134: Should return 'Unknown User' if user document does not exist", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => false,
    });

    const result = await getName("user123");

    expect(result).toEqual("Unknown User");
  });

  it("TC135: Should return 'Unnamed User' if name field is missing", async () => {
    const mockUserDoc = {
      exists: () => true,
      data: () => ({}),
    };

    (getDoc as jest.Mock).mockResolvedValueOnce(mockUserDoc);

    const result = await getName("user123");

    expect(result).toEqual("Unnamed User");
  });

  it("TC136: Should handle errors gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to fetch user"),
    );

    const result = await getName("user123");

    expect(result).toEqual("Unknown User");
  });
});

describe("setSelectedUserID", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC137: Should set the selected user ID in AsyncStorage", async () => {
    await setSelectedUserID("user123");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "selectedUserID",
      "user123",
    );
  });

  it("TC138: Should return if provided no user ID", async () => {
    await setSelectedUserID("");
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe("getSelectedUserID", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC139: Should get the selected user ID from AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("user123");

    const result = await getSelectedUserID();

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("selectedUserID");
    expect(result).toBe("user123");
  });

  it("TC140: Should return null if no selected user ID is set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const result = await getSelectedUserID();

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("selectedUserID");
    expect(result).toBeNull();
  });
});

describe("getSelectedUser", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC141: Should call for the selected user's data", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("user123");

    const mockUserData = { uid: "user123", name: "Test User" };

    jest.spyOn(UserAccountService.prototype, "getUserData");

    const result = await getSelectedUser();

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("selectedUserID");
    expect(UserAccountService.prototype.getUserData).toHaveBeenCalledWith(
      "user123",
    );
  });

  it("TC142: Should return null if no selected user ID is set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const result = await getSelectedUser();

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("selectedUserID");
    expect(result).toBeNull();
  });
});

describe("clearSelectedUserID", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC143: Should clear the selected user ID from AsyncStorage", async () => {
    await clearSelectedUserID();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("selectedUserID");
  });
});

describe("getPhysioInviteCode", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC144: Should return invite code ID when one exists", async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{ id: "INV123" }],
    };

    (collection as jest.Mock).mockReturnValue("inviteCodesRef");
    (query as jest.Mock).mockReturnValue("queryRef");
    (where as jest.Mock).mockReturnValue("whereRef");
    (getDocs as jest.Mock).mockResolvedValueOnce(mockSnapshot);

    const result = await getPhysioInviteCode("physio123");

    expect(where).toHaveBeenCalledWith("physioId", "==", "physio123");
    expect(getDocs).toHaveBeenCalled();
    expect(result).toEqual("INV123");
  });

  it("TC145: Should return null when no invite code exists", async () => {
    const mockSnapshot = {
      empty: true,
      docs: [],
    };

    (collection as jest.Mock).mockReturnValue("inviteCodesRef");
    (query as jest.Mock).mockReturnValue("queryRef");
    (where as jest.Mock).mockReturnValue("whereRef");
    (getDocs as jest.Mock).mockResolvedValueOnce(mockSnapshot);

    const result = await getPhysioInviteCode("physio123");

    expect(result).toBeNull();
  });

  it("TC146: Should return null when id doesn't exist", async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{ no_id: "INV123" }],
    };

    (collection as jest.Mock).mockReturnValue("inviteCodesRef");
    (query as jest.Mock).mockReturnValue("queryRef");
    (where as jest.Mock).mockReturnValue("whereRef");
    (getDocs as jest.Mock).mockResolvedValueOnce(mockSnapshot);

    const result = await getPhysioInviteCode("physio123");

    expect(where).toHaveBeenCalledWith("physioId", "==", "physio123");
    expect(getDocs).toHaveBeenCalled();
    expect(result).toEqual(null);
  });
});
