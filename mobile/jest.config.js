module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],

  // ✅ This prevents Jest from ever loading real firebase/expo internals
  moduleNameMapper: {
    "^firebase/auth$": "<rootDir>/lib/__mocks__/firebase-auth.ts",
    "^firebase/firestore$": "<rootDir>/lib/__mocks__/firebase-firestore.ts",
    "^firebase/app$": "<rootDir>/lib/__mocks__/firebase-app.ts",
  },

  // ts-jest config (safe defaults)
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      isolatedModules: true,
    },
  },
};