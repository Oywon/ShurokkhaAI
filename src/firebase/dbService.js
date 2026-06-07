// src/firebase/dbService.js
//
// Single, consistent database API for the whole app.
// Every function falls back to localStorage when Firestore is unreachable
// (offline, dev mode, or quota), so the UI is always functional.
//
// Collections:
//   users/{uid}                       - profile
//   vitals/{uid}_YYYY-MM-DD           - one document per user per day
//   sos/{auto}                        - emergency SOS events
//   reminders/{auto}                  - medication reminders
//   measurements/{auto}               - heart-rate / BP measurement history
//   mental_assessments/{auto}         - mental health quiz+game results
//
// All functions are safe to call without a currentUser — they no-op
// (or use a 'guest' key for localStorage) instead of throwing.

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { sendPasswordResetEmail, updateProfile as fbUpdateProfile } from "firebase/auth";
import { db, storage, auth } from "./config";

// Translate common Firebase auth / Firestore errors into Bengali.
export function errorMessage(err, fallback = "একটি সমস্যা হয়েছে, আবার চেষ্টা করুন।") {
  if (!err) return fallback;
  const code = err.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "ইমেইল ঠিকানা সঠিক নয়।";
    case "auth/user-not-found":
      return "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "পাসওয়ার্ড ভুল হয়েছে।";
    case "auth/user-disabled":
      return "এই অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে।";
    case "auth/too-many-requests":
      return "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    case "auth/network-request-failed":
      return "ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না।";
    case "auth/email-already-in-use":
      return "এই ইমেইল ইতিমধ্যে ব্যবহৃত হচ্ছে।";
    case "auth/weak-password":
      return "পাসওয়ার্ড আরো শক্তিশালী করুন (কমপক্ষে ৬ অক্ষর)।";
    case "auth/requires-recent-login":
      return "নিরাপত্তার জন্য আবার লগইন করুন।";
    default:
      return err.message || fallback;
  }
}

const LS = {
  user: (uid) => `mock_user_profile_${uid}`,
  vitals: "mock_vitals_history",
  photo: (uid) => `mock_photo_${uid}`,
  sos: "mock_sos_history",
  reminders: (uid) => `mock_reminders_${uid}`,
  measurements: (uid) => `mock_measurements_${uid}`,
  mentalAssessments: (uid) => `mock_mental_assessments_${uid}`,
};

// ── USERS ──────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn("Firestore getUserProfile fallback:", e.message);
  }
  const local = localStorage.getItem(LS.user(uid));
  return local ? JSON.parse(local) : null;
}

export async function saveUserProfile(uid, data) {
  if (!uid) return { ok: false, source: "noop" };
  const payload = { ...data, updatedAt: new Date() };
  try {
    await setDoc(doc(db, "users", uid), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    return { ok: true, source: "firestore" };
  } catch (e) {
    console.warn("Firestore saveUserProfile fallback:", e.message);
    localStorage.setItem(LS.user(uid), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
    return { ok: true, source: "local" };
  }
}

// ── PHOTO (profile picture) ───────────────────────────────────────
// Reads photoURL from Firestore (preferred) or localStorage fallback.
export async function getUserPhoto(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists() && snap.data().photoURL) return snap.data().photoURL;
  } catch (e) {
    console.warn("Firestore getUserPhoto fallback:", e.message);
  }
  return localStorage.getItem(LS.photo(uid)) || null;
}

// Persist a photo URL (or dataURL) to Firestore, with localStorage mirror.
export async function saveUserPhoto(uid, photoURL) {
  if (!uid || !photoURL) return { ok: false, source: "noop" };
  // Always mirror to localStorage so refreshes don't lose the photo
  try {
    localStorage.setItem(LS.photo(uid), photoURL);
  } catch (e) {
    console.warn("localStorage photo mirror failed:", e.message);
  }
  try {
    await setDoc(doc(db, "users", uid), { photoURL, updatedAt: serverTimestamp() }, { merge: true });
    return { ok: true, source: "firestore" };
  } catch (e) {
    console.warn("Firestore saveUserPhoto fallback:", e.message);
    return { ok: true, source: "local" };
  }
}

// ── AUTH (password reset / display name) ──────────────────────────
export async function sendResetEmail(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e, message: errorMessage(e) };
  }
}

export async function updateAuthProfile({ displayName, photoURL }) {
  if (!auth.currentUser) return { ok: false, message: "লগইন করা নেই।" };
  try {
    await fbUpdateProfile(auth.currentUser, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(photoURL !== undefined ? { photoURL } : {}),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e, message: errorMessage(e) };
  }
}

// ── VITALS (daily log) ─────────────────────────────────────────────
export async function getTodayVitals(uid, dateStr) {
  if (!uid) return null;
  const docId = `${uid}_${dateStr}`;
  try {
    const snap = await getDoc(doc(db, "vitals", docId));
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn("Firestore getTodayVitals fallback:", e.message);
  }
  const list = JSON.parse(localStorage.getItem(LS.vitals) || "[]");
  return list.find((r) => r.date === dateStr && r.userId === uid) || null;
}

export async function saveTodayVitals(uid, dateStr, payload) {
  if (!uid) return { ok: false, source: "noop" };
  const docId = `${uid}_${dateStr}`;
  const data = { ...payload, userId: uid, date: dateStr };
  try {
    await setDoc(doc(db, "vitals", docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return { ok: true, source: "firestore" };
  } catch (e) {
    console.warn("Firestore saveTodayVitals fallback:", e.message);
    let list = JSON.parse(localStorage.getItem(LS.vitals) || "[]");
    list = list.filter((r) => !(r.date === dateStr && r.userId === uid));
    list.push({ ...data, updatedAt: new Date().toISOString() });
    localStorage.setItem(LS.vitals, JSON.stringify(list));
    return { ok: true, source: "local" };
  }
}

export async function getVitalsHistory(uid, max = 30) {
  if (!uid) return [];
  try {
    // Simple query — no composite index required.
    // Sort in memory to stay inside the free Spark plan quotas.
    const q = query(collection(db, "vitals"), where("userId", "==", uid), limit(max * 2));
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => d.data());
    records.sort((a, b) => {
      const ta = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : new Date(a.updatedAt || 0).getTime();
      const tb = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : new Date(b.updatedAt || 0).getTime();
      return tb - ta;
    });
    return records.slice(0, max);
  } catch (e) {
    console.warn("Firestore getVitalsHistory fallback:", e.message);
    const list = JSON.parse(localStorage.getItem(LS.vitals) || "[]");
    return list
      .filter((r) => r.userId === uid)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, max);
  }
}

// ── SOS ────────────────────────────────────────────────────────────
export async function logSOS(uid, coords, extra = {}) {
  const data = { userId: uid || "guest", lat: coords?.lat, lng: coords?.lng, ...extra };
  try {
    const ref = await addDoc(collection(db, "sos"), { ...data, createdAt: serverTimestamp() });
    return { ok: true, source: "firestore", id: ref.id };
  } catch (e) {
    console.warn("Firestore logSOS fallback:", e.message);
    const list = JSON.parse(localStorage.getItem(LS.sos) || "[]");
    const entry = { id: `local_${Date.now()}`, ...data, createdAt: new Date().toISOString() };
    list.push(entry);
    localStorage.setItem(LS.sos, JSON.stringify(list));
    return { ok: true, source: "local", id: entry.id };
  }
}

export async function getRecentSOS(uid, max = 20) {
  try {
    const q = query(collection(db, "sos"), where("userId", "==", uid || "guest"), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    const list = JSON.parse(localStorage.getItem(LS.sos) || "[]");
    return list.filter((r) => r.userId === (uid || "guest")).slice(-max).reverse();
  }
}

// ── REMINDERS ──────────────────────────────────────────────────────
export async function getReminders(uid) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "reminders"), where("userId", "==", uid), orderBy("time", "asc"));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("Firestore getReminders fallback:", e.message);
  }
  return JSON.parse(localStorage.getItem(LS.reminders(uid)) || "[]");
}

export async function addReminder(uid, reminder) {
  if (!uid) return { ok: false };
  const data = { ...reminder, userId: uid, createdAt: new Date() };
  try {
    const ref = await addDoc(collection(db, "reminders"), { ...data, createdAt: serverTimestamp() });
    return { ok: true, source: "firestore", id: ref.id, item: { id: ref.id, ...data } };
  } catch (e) {
    console.warn("Firestore addReminder fallback:", e.message);
    const list = JSON.parse(localStorage.getItem(LS.reminders(uid)) || "[]");
    const entry = { id: `local_${Date.now()}`, ...data };
    list.push(entry);
    localStorage.setItem(LS.reminders(uid), JSON.stringify(list));
    return { ok: true, source: "local", id: entry.id, item: entry };
  }
}

export async function updateReminder(uid, id, patch) {
  if (!uid || !id) return { ok: false };
  if (id.startsWith("local_")) {
    const list = JSON.parse(localStorage.getItem(LS.reminders(uid)) || "[]");
    const next = list.map((r) => (r.id === id ? { ...r, ...patch } : r));
    localStorage.setItem(LS.reminders(uid), JSON.stringify(next));
    return { ok: true, source: "local" };
  }
  try {
    await updateDoc(doc(db, "reminders", id), { ...patch, updatedAt: serverTimestamp() });
    return { ok: true, source: "firestore" };
  } catch (e) {
    console.warn("Firestore updateReminder failed:", e.message);
    return { ok: false, error: e.message };
  }
}

export async function deleteReminder(uid, id) {
  if (!uid || !id) return { ok: false };
  if (id.startsWith("local_")) {
    const list = JSON.parse(localStorage.getItem(LS.reminders(uid)) || "[]").filter((r) => r.id !== id);
    localStorage.setItem(LS.reminders(uid), JSON.stringify(list));
    return { ok: true, source: "local" };
  }
  try {
    await deleteDoc(doc(db, "reminders", id));
    return { ok: true, source: "firestore" };
  } catch (e) {
    console.warn("Firestore deleteReminder failed:", e.message);
    return { ok: false, error: e.message };
  }
}

// ── MEASUREMENTS (heart-rate / BP history) ─────────────────────────
export async function logMeasurement(uid, measurement) {
  if (!uid) return { ok: false };
  const data = { ...measurement, userId: uid, createdAt: new Date() };
  try {
    const ref = await addDoc(collection(db, "measurements"), { ...data, createdAt: serverTimestamp() });
    return { ok: true, source: "firestore", id: ref.id };
  } catch (e) {
    const list = JSON.parse(localStorage.getItem(LS.measurements(uid)) || "[]");
    list.push({ id: `local_${Date.now()}`, ...data });
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    list.splice(100); // keep last 100
    localStorage.setItem(LS.measurements(uid), JSON.stringify(list));
    return { ok: true, source: "local" };
  }
}

export async function getMeasurements(uid, max = 20) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "measurements"), where("userId", "==", uid), limit(max * 2));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return list.slice(0, max);
  } catch (e) {
    const list = JSON.parse(localStorage.getItem(LS.measurements(uid)) || "[]");
    return list.slice(0, max);
  }
}

// ── LIVE SUBSCRIPTIONS ─────────────────────────────────────────────
// Returns an unsubscribe function. Safe to call even when offline.
export function subscribeReminders(uid, onChange, onError) {
  if (!uid) return () => {};
  try {
    const q = query(collection(db, "reminders"), where("userId", "==", uid), orderBy("time", "asc"));
    return onSnapshot(
      q,
      (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.warn("Reminders subscription error:", err.message);
        onError && onError(err);
        // Fallback: return localStorage data once
        onChange(JSON.parse(localStorage.getItem(LS.reminders(uid)) || "[]"));
      }
    );
  } catch (e) {
    onError && onError(e);
    onChange(JSON.parse(localStorage.getItem(LS.reminders(uid)) || "[]"));
    return () => {};
  }
}

export function subscribeTodayVitals(uid, dateStr, onChange) {
  if (!uid) return () => {};
  const docId = `${uid}_${dateStr}`;
  try {
    return onSnapshot(
      doc(db, "vitals", docId),
      (snap) => onChange(snap.exists() ? snap.data() : null),
      (err) => {
        console.warn("Vitals subscription error:", err.message);
        const list = JSON.parse(localStorage.getItem(LS.vitals) || "[]");
        onChange(list.find((r) => r.date === dateStr && r.userId === uid) || null);
      }
    );
  } catch (e) {
    const list = JSON.parse(localStorage.getItem(LS.vitals) || "[]");
    onChange(list.find((r) => r.date === dateStr && r.userId === uid) || null);
    return () => {};
  }
}

// ── MENTAL HEALTH SUGGESTIONS ────────────────────────────────────────
//
// 100-entry Bengali mental-health suggestion database lives in
// src/data/mentalHealthSuggestions.js. We import it lazily so the rest of
// the app doesn't pay the cost unless the mental-health modal is opened.
import {
  MENTAL_HEALTH_SUGGESTIONS,
  MENTAL_HEALTH_CATEGORIES,
  CRISIS_RESOURCES,
  getSuggestionsByCategory,
} from "../data/mentalHealthSuggestions";

/**
 * Return suggestions filtered by category. If category is omitted or
 * unknown, returns the full list.
 *
 * @param {string} [category]  sad | anxious | stressed | lonely | angry | ok | crisis
 * @param {number} [limit]     optional cap
 * @returns {Array<{id,title,body,duration,tag,category}>}
 */
export async function getMentalHealthSuggestions(category, limit) {
  const list = getSuggestionsByCategory(category, limit);
  // Always prepend crisis resources for the dominant non-ok categories.
  if (category && category !== "ok" && category !== "crisis") {
    return [...CRISIS_RESOURCES.slice(0, 1), ...list];
  }
  return list;
}

/**
 * Lightweight metadata for the UI (counts, labels, hotlines).
 */
export function getMentalHealthMeta() {
  return {
    categories: MENTAL_HEALTH_CATEGORIES,
    crisisResources: CRISIS_RESOURCES,
    total: MENTAL_HEALTH_SUGGESTIONS.length
  };
}

/**
 * Persist a mental-health assessment (quiz + game result) for later review.
 * Returns { ok, source, id } just like addReminder().
 */
export async function saveMentalAssessment(uid, assessment) {
  const id = `mh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    id,
    userId: uid || "guest",
    createdAt: new Date().toISOString(),
    ...assessment
  };

  if (uid) {
    try {
      await addDoc(collection(db, "mental_assessments"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      return { ok: true, source: "firestore", id, item: payload };
    } catch (e) {
      console.warn("saveMentalAssessment firestore error, using localStorage:", e.message);
    }
  }

  const key = LS.mentalAssessments(uid || "guest");
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.unshift(payload);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  return { ok: true, source: "local", id, item: payload };
}

/**
 * Read recent assessments for the given user (or guest).
 */
export async function getMentalAssessments(uid, max = 10) {
  if (uid) {
    try {
      const q = query(
        collection(db, "mental_assessments"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("getMentalAssessments firestore error, using localStorage:", e.message);
    }
  }
  const list = JSON.parse(localStorage.getItem(LS.mentalAssessments(uid || "guest")) || "[]");
  return list.slice(0, max);
}
