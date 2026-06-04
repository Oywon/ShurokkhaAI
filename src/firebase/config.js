// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1Np6hHeaGaCKc6URNO661by0nsKW4F7w",
  authDomain: "shurokkhaai.firebaseapp.com",
  projectId: "shurokkhaai",
  storageBucket: "shurokkhaai.firebasestorage.app",
  messagingSenderId: "230178767367",
  appId: "1:230178767367:web:5cf9f20f53386da243e0a2",
  measurementId: "G-YXPK22D72F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { /* ignore if unavailable in dev */ }

// Exports for app
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;