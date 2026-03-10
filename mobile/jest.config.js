module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>/lib"],

  // ✅ This prevents Jest from ever loading real firebase/expo internals
  moduleNameMapper: {
    "^firebase/auth$": "<rootDir>/lib/__mocks__/firebase-auth.ts",
    "^firebase/firestore$": "<rootDir>/lib/__mocks__/firebase-firestore.ts",
    "^firebase/app$": "<rootDir>/lib/__mocks__/firebase-app.ts",
    "^@react-native-async-storage/async-storage$": "<rootDir>/lib/__mocks__/async-storage.ts",
  },

  collectCoverageFrom: [
    "lib/**/*.ts",
    "!lib/**/*.d.ts",
    "!lib/**/__tests__/**",
    "!lib/**/__mocks__/**",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json"
      }
    ]
  },

  // ts-jest config (safe defaults)

  //Added this - Maham
  clearMocks: true,
};