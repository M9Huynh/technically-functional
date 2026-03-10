import {
  addDoc,
  and,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  addUserExercise,
  Exercise,
  getExercise,
  getExercisesById,
  getGeneralExercises,
  getSelectedExercises,
  removeUserExercise,
  updateUserExercise,
} from "../exerciseData";

describe("getExercisesById", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC147: should return exercises for a valid user ID", async () => {
    const mockExercises: Exercise[] = [
      {
        id: "exercise1",
        title: "Exercise 1",
        description: "Description for Exercise 1",
        enabled: true,
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({
      empty: false,
      docs: mockExercises.map((ex) => ({
        data: () => ex,
      })),
    });

    const result = await getExercisesById("validUserId");

    expect(result).toEqual(mockExercises);
  });

  it("TC148: should return undefined for a user ID with no exercises", async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      empty: true,
      docs: [],
    });

    const result = await getExercisesById("userIdWithNoExercises");

    expect(result).toBeUndefined();
  });

  it("TC149: should return undefined if there is an error fetching exercises", async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const result = await getExercisesById("userIdWithError");

    expect(result).toBeUndefined();
  });
});

describe("getExercise", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC150: should return exercise data for a valid exercise ID", async () => {
    const mockExercise: Exercise = {
      id: "exercise1",
      title: "Exercise 1",
      description: "Description for Exercise 1",
      enabled: true,
    };

    (getDoc as jest.Mock).mockResolvedValue({
      data: () => mockExercise,
    });

    const result = await getExercise("exercise1");

    expect(result).toEqual(mockExercise);
  });

  it("TC151: should return undefined for an invalid exercise ID", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      data: () => undefined,
    });

    const result = await getExercise("invalidExerciseId");

    expect(result).toBeUndefined();
  });

  it("TC152: should return undefined if there is an error fetching exercise", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const result = await getExercise("exerciseIdWithError");

    expect(result).toBeUndefined();
  });
});

describe("getGeneralExercises", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC153: should return a list of general exercises", async () => {
    const mockExercises: Exercise[] = [
      {
        id: "exercise1",
        title: "Exercise 1",
        description: "Description for Exercise 1",
        enabled: true,
      },
      {
        id: "exercise2",
        title: "Exercise 2",
        description: "Description for Exercise 2",
        enabled: true,
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({
      empty: false,
      docs: mockExercises.map((ex) => ({
        data: () => ex,
      })),
    });

    const result = await getGeneralExercises();

    expect(result).toEqual(mockExercises);
  });

  it("TC154: should return undefined if there are no general exercises", async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      empty: true,
      docs: [],
    });

    const result = await getGeneralExercises();

    expect(result).toBeUndefined();
  });

  it("TC155: should return undefined if there is an error fetching general exercises", async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const result = await getGeneralExercises();

    expect(result).toBeUndefined();
  });
});

describe("removeUserExercise", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC156: should remove an exercise for a valid exercise ID", async () => {
    const mockDocRef = "exampleRef";

    const mockSnapshot = {
      empty: false,
      docs: [
        {
          ref: mockDocRef,
          data: () => ({
            id: "exercise1",
            title: "Exercise 1",
            description: "Description for Exercise 1",
            enabled: true,
          }),
        },
      ],
    };

    (getDocs as jest.Mock).mockResolvedValueOnce(mockSnapshot);

    await removeUserExercise("exercise1", "Exercise 1");

    expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
  });

  it("TC157: should not attempt to remove an exercise if it does not exist", async () => {
    const mockSnapshot = {
      empty: true,
      docs: [],
    };

    (getDocs as jest.Mock).mockResolvedValueOnce(mockSnapshot);

    await removeUserExercise("exercise1", "Exercise 1");

    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("TC158: should handle errors gracefully", async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    await expect(
      removeUserExercise("exercise1", "Exercise 1"),
    ).resolves.toBeUndefined();

    expect(deleteDoc).not.toHaveBeenCalled();
  });
});

describe("addUserExercise", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("TC159: should add a new exercise for a user", async () => {
    const mockDocRef = { id: "newExerciseId" };

    (addDoc as jest.Mock).mockResolvedValueOnce(mockDocRef);

    await addUserExercise("userId", {
      id: "exercise1",
      title: "New Exercise",
      description: "Description for new exercise",
      enabled: true,
    });

    expect(addDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      title: "New Exercise",
      description: "Description for new exercise",
      id: expect.anything(),
    });
  });

  it("TC160: should handle errors gracefully", async () => {
    (addDoc as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    await expect(
      addUserExercise("userId", {
        id: "exercise1",
        title: "New Exercise",
        description: "Description for new exercise",
        enabled: true,
      }),
    ).resolves.toBeUndefined();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});

describe("updateUserExercise", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("TC161: should update an existing exercise for a user", async () => {
        const mockDocRef = { id: "existingExerciseId" };
        (addDoc as jest.Mock).mockResolvedValueOnce(mockDocRef);
        (getDocs as jest.Mock).mockResolvedValueOnce({
            empty: false,
            docs: [
                {
                    ref: mockDocRef,
                    data: () => ({
                        id: "existingExerciseId",
                        title: "Exercise Title",
                        description: "Updated Description",
                        enabled: true,
                    }),
                },
            ],
        });

        await updateUserExercise("userId", "Exercise Title", "Updated Description");

        expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
            title: "Exercise Title",
            description: "Updated Description",
        });
    });

    it("TC162: should not attempt to update if exercise does not exist", async () => {
        (getDocs as jest.Mock).mockResolvedValueOnce({
            empty: true,
            docs: [],
        });

        await updateUserExercise("userId", "Nonexistent Exercise", "Description");

        expect(updateDoc).not.toHaveBeenCalled();
    });

    it("TC163: should handle errors gracefully", async () => {
        (getDocs as jest.Mock).mockRejectedValueOnce(new Error("Firestore error"));

        await updateUserExercise("userId", "Nonexistent Exercise", "Description");

        expect(updateDoc).not.toHaveBeenCalled();
    });
});

describe("getSelectedExercises", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("TC164: should return selected exercises for a valid user ID", async () => {
        const mockExercises: Exercise[] = [
            {
                id: "exercise1",
                title: "Exercise 1",
                description: "Description for Exercise 1",
                enabled: true,
            },
        ];

        (getDocs as jest.Mock).mockResolvedValue({
            empty: false,
            docs: mockExercises.map((ex) => ({
                data: () => ex,
            })),
        });

        const result = await getSelectedExercises("validUserId");

        expect(result).toEqual(mockExercises);
    });

    it("TC165: should return undefined for a user ID with no selected exercises", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            empty: true,
            docs: [],
        });

        const result = await getSelectedExercises("userIdWithNoSelectedExercises");

        expect(result).toBeUndefined();
    });

    it("TC166: should handle errors gracefully", async () => {
        (getDocs as jest.Mock).mockRejectedValue(new Error("Firestore error"));

        const result = await getSelectedExercises("invalidUserId");

        expect(result).toBeUndefined();
    });
  });