// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "API_ahad_firebase",
  authDomain: "surokkhaai.firebaseapp.com",
  projectId: "surokkhaai",
  storageBucket: "surokkhaai.firebasestorage.app",
  messagingSenderId: "48063153996",
  appId: "1:48063153996:web:abbd4cbf88a4cf00f731e9",
  measurementId: "G-1WF3BMNCY4"
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
