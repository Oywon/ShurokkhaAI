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