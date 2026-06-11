// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getEnvVar } from '../utils/env';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Values are read from `.env` (see `.env.example`).
const firebaseConfig = {
<<<<<<< HEAD
  apiKey: "API_ahad_firebase",
  authDomain: "surokkhaai.firebaseapp.com",
  projectId: "surokkhaai",
  storageBucket: "surokkhaai.firebasestorage.app",
  messagingSenderId: "48063153996",
  appId: "1:48063153996:web:abbd4cbf88a4cf00f731e9",
  measurementId: "G-1WF3BMNCY4"
=======
  apiKey: getEnvVar('REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('REACT_APP_FIREBASE_APP_ID'),
  measurementId: getEnvVar('REACT_APP_FIREBASE_MEASUREMENT_ID'),
>>>>>>> 7b9be1a3 (UI FIX)
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { /* ignore if unavailable in dev */ }

// Configure Auth
export const auth = getAuth(app);

// For development/testing: Disable app verification to allow OTP testing without proper domain setup
// Remove this line for production
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  auth.settings.appVerificationDisabledForTesting = true;
}

// Note: Firebase Phone Authentication requires the Phone provider to be enabled in
// Firebase Console → Authentication → Sign-in method.
// Also add your app origin under Authorized domains in the Firebase Console.
// For local development, add http://localhost and http://127.0.0.1.

// Exports for app
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
