import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { errorMessage } from '../firebase/dbService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive a stable, unique mock uid from the email so each user
  // has their own scoped localStorage data (profile, vitals, etc).
  function makeMockUid(email) {
    // Simple, deterministic hash so the same email always gets the same uid
    // across sessions and reloads.
    let h = 0;
    const s = String(email || "guest").toLowerCase().trim();
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return "mock_" + Math.abs(h).toString(36);
  }

  // SHA-256 hash a string. Uses crypto.subtle when available
  // (https/localhost) and falls back to a deterministic JS hash for
  // file:// or older browsers. This is dev-only mock auth.
  async function hashPassword(password) {
    const pw = String(password || "");
    try {
      if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
        const buf = new TextEncoder().encode(pw);
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch (_) {
      /* fall through to JS hash */
    }
    let h = 5381;
    for (let i = 0; i < pw.length; i++) {
      h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
    }
    return "fallback_" + Math.abs(h).toString(36) + "_" + pw.length;
  }

  // Read the local mock user record (uid + password hash) for an email.
  // Returns null if no such user has signed up in this browser.
  function getMockUserRecord(email) {
    try {
      const key = "mock_user_record_" + String(email).toLowerCase().trim();
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.uid || !parsed.passwordHash) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function setMockUserRecord(email, record) {
    const key = "mock_user_record_" + String(email).toLowerCase().trim();
    localStorage.setItem(key, JSON.stringify(record));
  }

  async function signup(email, password) {
    if (!email || !password) {
      throw new Error("দয়া করে ইমেইল ও পাসওয়ার্ড দিন।");
    }
    if (String(password).length < 6) {
      throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
    }
    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth signup failed, falling back to Local Mock Auth:", err.message);
      const uid = makeMockUid(email);
      const passwordHash = await hashPassword(password);
      const mockUser = { uid, email };
      setMockUserRecord(email, { uid, email, passwordHash, createdAt: Date.now() });
      setCurrentUser(mockUser);
      localStorage.setItem("mock_current_user", JSON.stringify(mockUser));
      return { user: mockUser };
    }
  }

  async function login(email, password) {
    if (!email || !password) {
      throw new Error("দয়া করে ইমেইল ও পাসওয়ার্ড দিন।");
    }
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      // Firebase Auth itself failed. Fall back to local mock auth,
      // but FIRST verify the password against the locally-stored hash.
      console.warn("Firebase Auth login failed, falling back to Local Mock Auth:", err.message);
      const record = getMockUserRecord(email);
      if (!record) {
        throw new Error("এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই। আগে নিবন্ধন করুন।");
      }
      const inputHash = await hashPassword(password);
      if (inputHash !== record.passwordHash) {
        throw new Error("পাসওয়ার্ড ভুল হয়েছে। আবার চেষ্টা করুন।");
      }
      const mockUser = { uid: record.uid, email: record.email || email };
      setCurrentUser(mockUser);
      localStorage.setItem("mock_current_user", JSON.stringify(mockUser));
      return { user: mockUser };
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase Auth signout failed:", e.message);
    }
    setCurrentUser(null);
    localStorage.removeItem("mock_current_user");
  }

  // Send a Firebase password-reset email.
  // Returns { ok, message, code?, simulated? } so the page can show Bengali
  // feedback. If Firebase is unavailable, we still "deliver" a 6-digit code
  // locally (simulated email) so the user can recover their account offline.
  async function resetPassword(email) {
    if (!email) return { ok: false, message: "ইমেইল ঠিকানা দিন।" };
    try {
      await sendPasswordResetEmail(auth, email);
      return { ok: true, message: "পাসওয়ার্ড রিসেট লিঙ্ক ইমেইলে পাঠানো হয়েছে।" };
    } catch (err) {
      console.warn("Firebase resetPassword failed, falling back to local code:", err.message);
      // Local fallback: only works for accounts that exist locally.
      const record = getMockUserRecord(email);
      if (!record) {
        return {
          ok: false,
          message: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।",
        };
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
      localStorage.setItem(
        "mock_reset_" + String(email).toLowerCase().trim(),
        JSON.stringify({ code, uid: record.uid, expiresAt })
      );
      return {
        ok: true,
        simulated: true,
        code,
        message:
          "রিসেট কোড (অফলাইন মোডে): " +
          code +
          " — ১৫ মিনিটের মধ্যে ব্যবহার করুন।",
      };
    }
  }

  // Verify a locally-issued reset code and set a new password for the user.
  // Returns { ok, message }. After success, the user can log in with the new
  // password immediately.
  async function confirmResetCode(email, code, newPassword) {
    if (!email || !code || !newPassword) {
      return { ok: false, message: "ইমেইল, কোড ও নতুন পাসওয়ার্ড দিন।" };
    }
    if (String(newPassword).length < 6) {
      return { ok: false, message: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" };
    }
    const key = "mock_reset_" + String(email).toLowerCase().trim();
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(key) || "null");
    } catch (_) {
      stored = null;
    }
    if (!stored || !stored.code || !stored.expiresAt) {
      return { ok: false, message: "রিসেট কোড পাওয়া যায়নি। আবার চেষ্টা করুন।" };
    }
    if (Date.now() > stored.expiresAt) {
      localStorage.removeItem(key);
      return { ok: false, message: "রিসেট কোডের মেয়াদ শেষ হয়েছে। নতুন কোড নিন।" };
    }
    if (String(stored.code) !== String(code).trim()) {
      return { ok: false, message: "রিসেট কোড ভুল হয়েছে।" };
    }
    const record = getMockUserRecord(email);
    if (!record) {
      return { ok: false, message: "অ্যাকাউন্ট পাওয়া যায়নি।" };
    }
    const passwordHash = await hashPassword(newPassword);
    setMockUserRecord(email, { ...record, passwordHash, updatedAt: Date.now() });
    localStorage.removeItem(key);
    return { ok: true, message: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন লগইন করুন।" };
  }

  // Update Firebase Auth profile (display name / photo URL).
  // Throws on failure so the caller can show the message.
  async function updateAuthProfile({ displayName, photoURL } = {}) {
    if (!auth.currentUser) throw new Error("লগইন করা নেই।");
    await fbUpdateProfile(auth.currentUser, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(photoURL !== undefined ? { photoURL } : {}),
    });
    // Refresh local user reference so the rest of the app sees the change
    if (auth.currentUser) setCurrentUser({ ...auth.currentUser });
  }

  useEffect(() => {
    // Listen for Auth changes in Firebase
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
      } else {
        // Fallback to local storage session if Firebase is not signed in
        const localUser = localStorage.getItem("mock_current_user");
        if (localUser) {
          setCurrentUser(JSON.parse(localUser));
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      }
    }, (err) => {
      console.warn("onAuthStateChanged error, attempting LocalStorage session fallback:", err.message);
      const localUser = localStorage.getItem("mock_current_user");
      if (localUser) {
        setCurrentUser(JSON.parse(localUser));
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    confirmResetCode,
    updateAuthProfile,
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
