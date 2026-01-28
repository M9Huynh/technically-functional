// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyAMzESiH-0w3CQCXyeJ4neie4jzGtiy8",
  authDomain: "physiocompaion.firebaseapp.com",
  projectId: "physiocompaion",
  storageBucket: "physiocompaion.firebasestorage.app",
  messagingSenderId: "750649514141",
  appId: "1:750649514141:web:0139ac74b0f18a51f3dc74",
  measurementId: "G-M40FYYN2Q5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
