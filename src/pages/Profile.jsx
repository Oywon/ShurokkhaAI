import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { storage } from "../firebase/config";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getUserProfile,
  getUserPhoto,
  saveUserPhoto,
  getVitalsHistory,
  subscribeReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  updateAuthProfile
} from "../firebase/dbService";
import { useNavigate, Link } from "react-router-dom";
import { fetchCurrentWeather } from "../utils/weather";
import { measureHeartRate, estimateBloodPressure } from "../utils/healthMeasure";
import { analyzePrescriptionAPI } from "../utils/ai";
import {
  QUIZ_ITEMS,
  QUIZ_OPTIONS,
  scoreQuiz,
  QUIZ_CATEGORY_LABELS,
} from "../utils/mentalHealthQuiz";
import {
  GAME_CONFIG,
  makeEmptySessionState,
  newRound,
  classifyResponse,
  summarizeSession,
} from "../utils/cognitiveGame";
import {
  getMentalHealthSuggestions,
  getMentalHealthMeta,
  saveMentalAssessment,
} from "../firebase/dbService";
import {
  calculateNutritionPlan,
  GOAL_OPTIONS,
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS
} from "../utils/nutritionCalculator";

function intensityBn(level) {
  if (level === "mild") return "হালকা";
  if (level === "moderate") return "মাঝারি";
  return "তীব্র";
}

function Meter({ label, value, color }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className={"mh-meter mh-meter-" + color}>
      <div className="mh-meter-label">{label}</div>
      <div className="mh-meter-track">
        <div className="mh-meter-fill" style={{ width: v + "%" }} />
      </div>
      <div className="mh-meter-value">{v}</div>
    </div>
  );
}

export default function Profile() {
  const { currentUser, logout, updateAuthProfile: updateAuthCtx } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [hasTodayEntry, setHasTodayEntry] = useState(false);
  const todayIso = new Date().toISOString().split("T")[0];
  const [vitals, setVitals] = useState({
    temperature: "36.8",
    bloodPressure: "120/80",
    oxygen: "98",
    heartRate: "72"
  });

  const [reminders, setReminders] = useState([
    { id: 1, label: "প্যারাসিটামল ৫০০মি.গ্রা.", time: "সকাল ৮:০০", done: true, icon: "💊", color: "purple" },
    { id: 2, label: "পানি পান করুন", time: "দুপুর ১২:০০", done: false, icon: "💧", color: "blue" },
    { id: 3, label: "রক্তচাপ পরীক্ষা", time: "বিকাল ৫:০০", done: false, icon: "❤️", color: "red" }
  ]);

  const [activeModal, setActiveModal] = useState(null);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [ocrFileName, setOcrFileName] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Mental health assessment state ────────────────────────
  // step: 'intro' | 'game' | 'quiz' | 'result'
  const [mhStep, setMhStep] = useState("intro");
  const [mhGame, setMhGame] = useState(makeEmptySessionState());
  const [mhQuiz, setMhQuiz] = useState({});      // {q1:0, q2:3, ...}
  const [mhQuizIndex, setMhQuizIndex] = useState(0);
  const [mhResult, setMhResult] = useState(null); // { quiz, game, suggestions, ... }
  const [mhLoading, setMhLoading] = useState(false);
  const mhGameTimers = useRef([]);                // active setTimeout handles

  // ── Nutrition planner state ───────────────────────────────
  // step: 'form' | 'result'
  const [nutStep, setNutStep] = useState("form");
  const [nutInput, setNutInput] = useState({
    weight: "",
    height: "",
    age: "",
    gender: "male",
    exerciseHours: 3,
    goal: "maintain"
  });
  const [nutResult, setNutResult] = useState(null);
  const [nutErrors, setNutErrors] = useState({});
  const [nutCalculating, setNutCalculating] = useState(false);

  // ── Profile photo ──────────────────────────────────────────
  const [photoURL, setPhotoURL] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const photoInputRef = useRef(null);

  // ── Weather ────────────────────────────────────────────────
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // ── Heart-rate (PPG) measurement ───────────────────────────
  const [hrState, setHrState] = useState({ status: "idle", elapsed: 0, bpm: null, progress: 0 });
  const hrVideoRef = useRef(null);
  const stopMeasureRef = useRef(null); // canceller returned by measureHeartRate

  // ── Blood-pressure result ──────────────────────────────────
  const [bloodState, setBloodState] = useState({ status: "idle", busy: false, systolic: null, diastolic: null, hr: null, hrv: null });

  // Load saved photo (Firestore) and weather on mount
  useEffect(() => {
    if (!currentUser) return;
    // Load photo via dbService (Firestore + localStorage fallback)
    (async () => {
      const url = await getUserPhoto(currentUser.uid);
      if (url) setPhotoURL(url);
    })();

    // Fetch live weather
    setWeatherLoading(true);
    fetchCurrentWeather()
      .then((w) => setWeather(w))
      .finally(() => setWeatherLoading(false));
  }, [currentUser]);

  // Subscribe to reminders (live) via dbService
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeReminders(
      currentUser.uid,
      (list) => {
        setReminders(Array.isArray(list) ? list : []);
        setLoading(false);
      },
      (err) => {
        console.warn("Reminders subscription failed:", err.message);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentUser]);

  // When the heart-rate modal opens, reset state
  useEffect(() => {
    if (activeModal === "heart") {
      setHrState({ status: "idle", elapsed: 0, bpm: null, progress: 0 });
    }
  }, [activeModal]);

  // Compress an image File to a JPEG dataURL under `maxBytes` (default ~500KB)
  // by resizing with a canvas until the encoded size fits.
  function compressImage(file, maxBytes = 500 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("ফাইল পড়া যায়নি"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("ছবি লোড করা যায়নি"));
        img.onload = () => {
          // Try descending quality + max-edge until the JPEG fits
          const tryEncode = (maxEdge, quality) =>
            new Promise((res) => {
              const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
              const w = Math.round(img.width * ratio);
              const h = Math.round(img.height * ratio);
              const canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, w, h);
              res(canvas.toDataURL("image/jpeg", quality));
            });
          (async () => {
            const sizes = [1024, 768, 512, 384, 256];
            const qualities = [0.85, 0.7, 0.55, 0.4];
            for (const s of sizes) {
              for (const q of qualities) {
                const dataUrl = await tryEncode(s, q);
                // base64 length * 0.75 ≈ byte size
                const approxBytes = Math.floor(dataUrl.length * 0.75);
                if (approxBytes <= maxBytes) return resolve(dataUrl);
              }
            }
            // Last resort: smallest possible
            resolve(await tryEncode(128, 0.4));
          })().catch(reject);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!currentUser) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("শুধু ছবি ফাইল আপলোড করুন (jpg, png, webp...)");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("ফাইল ১০ MB এর বেশি। ছোট ছবি বেছে নিন।");
      e.target.value = "";
      return;
    }

    setPhotoUploading(true);
    setPhotoError(null);

    // 1) Try Firebase Storage with the original file first
    try {
      const path = `profile_photos/${currentUser.uid}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      setPhotoURL(url);
      // Persist to Firestore + localStorage mirror via dbService
      await saveUserPhoto(currentUser.uid, url);
      // Mirror to Auth profile (best-effort, non-blocking)
      try {
        if (updateAuthCtx) await updateAuthCtx({ photoURL: url });
        else await updateAuthProfile({ photoURL: url });
      } catch (authErr) {
        console.warn("Auth profile photoURL mirror failed:", authErr.message);
      }
      setPhotoUploading(false);
      e.target.value = "";
      return;
    } catch (uploadErr) {
      console.warn("Storage upload failed, trying compressed local fallback:", uploadErr.message);
    }

    // 2) Fallback — compress to a small JPEG and store in localStorage
    try {
      const dataUrl = await compressImage(file, 400 * 1024);
      setPhotoURL(dataUrl);
      // dbService.saveUserPhoto mirrors to localStorage (and tries Firestore)
      const result = await saveUserPhoto(currentUser.uid, dataUrl);
      if (!result || !result.ok) {
        setPhotoError("ছবিটি এই সেশনের জন্য দেখানো হচ্ছে, সেভ হবে না (localStorage সীমা পূর্ণ)।");
      } else {
        // Best-effort mirror to Auth profile (non-blocking)
        try {
          if (updateAuthCtx) await updateAuthCtx({ photoURL: dataUrl });
          else await updateAuthProfile({ photoURL: dataUrl });
        } catch (authErr) {
          console.warn("Auth profile photoURL mirror (fallback) failed:", authErr.message);
        }
      }
    } catch (compressErr) {
      console.error("Image compression failed:", compressErr);
      setPhotoError("ছবি প্রসেস করা যায়নি। অনুগ্রহ করে অন্য ছবি চেষ্টা করুন।");
    } finally {
      setPhotoUploading(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  // Trigger the hidden file input (works on iOS Safari where nested <label><input>
  // can be flaky — clicking the button and programmatically opening the input is reliable).
  function openPhotoPicker() {
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  }

  async function startHeartRate() {
    if (!hrVideoRef.current) return;
    setHrState({ status: "measuring", elapsed: 0, bpm: null, progress: 0 });
    const duration = 30000;
    try {
      const result = await measureHeartRate(
        hrVideoRef.current,
        duration,
        ({ elapsedMs, bpm }) => {
          setHrState({
            status: "measuring",
            elapsed: elapsedMs,
            bpm,
            progress: Math.min(100, (elapsedMs / duration) * 100)
          });
        }
      );
      // Capture stop() so we can release the camera if the user closes the modal
      if (result && typeof result.stop === "function") {
        stopMeasureRef.current = result.stop;
      }
      if (result.stopped) {
        // User cancelled via stop()
        setHrState({ status: "idle", elapsed: 0, bpm: null, progress: 0 });
        return;
      }
      setHrState({
        status: "done",
        elapsed: duration,
        bpm: result.bpm,
        progress: 100
      });
    } catch (err) {
      console.error("Heart rate measurement failed:", err);
      setHrState({ status: "error", elapsed: 0, bpm: null, progress: 0, error: err.message });
    }
  }

  async function startBloodPressure() {
    if (!hrState.bpm) {
      alert("প্রথমে হার্টরেট পরিমাপ করুন।");
      return;
    }
    const age = parseInt(profile?.age, 10) || 40;
    const result = estimateBloodPressure({ bpm: hrState.bpm, age });
    setBloodState({ status: "done", systolic: result.systolic, diastolic: result.diastolic, hr: hrState.bpm, hrv: result.hrv });
  }

  // Cancel any in-progress measurement (called when modal closes)
  function cancelMeasurement() {
    try {
      if (stopMeasureRef.current) {
        stopMeasureRef.current();
        stopMeasureRef.current = null;
      }
    } catch (e) { /* ignore */ }
  }

  function closeModal() {
    cancelMeasurement();
    cancelMentalTimers();
    setMhStep("intro");
    setMhGame(makeEmptySessionState());
    setMhQuiz({});
    setMhQuizIndex(0);
    setMhResult(null);
    setActiveModal(null);
  }

  // ── Mental-health: brain game handlers ────────────────────
  function cancelMentalTimers() {
    mhGameTimers.current.forEach((t) => clearTimeout(t));
    mhGameTimers.current = [];
  }

  function startMentalGame() {
    cancelMentalTimers();
    setMhStep("game");
    setMhGame({ roundIndex: 0, phase: "waiting", rounds: [], startedAt: Date.now() });
    scheduleMentalTarget(0, []);
  }

  function scheduleMentalTarget(roundIndex, prevRounds) {
    if (roundIndex >= GAME_CONFIG.totalRounds) {
      finishMentalGame([...prevRounds]);
      return;
    }
    const round = newRound(roundIndex);
    const rounds = [...prevRounds, round];
    setMhGame((g) => ({ ...g, roundIndex, phase: "waiting", rounds }));

    const t1 = setTimeout(() => {
      round.shownAt = Date.now();
      setMhGame((g) => ({ ...g, phase: "live" }));
      const t2 = setTimeout(() => {
        // No response within window → miss
        if (round.outcome === null) {
          round.respondedAt = round.shownAt + GAME_CONFIG.responseWindowMs;
          round.outcome = "miss";
        }
        const next = roundIndex + 1;
        scheduleMentalTarget(next, rounds);
      }, GAME_CONFIG.responseWindowMs + 200);
      mhGameTimers.current.push(t2);
    }, round.delay);
    mhGameTimers.current.push(t1);
  }

  function tapMentalTarget() {
    setMhGame((g) => {
      if (g.phase !== "live") return g;
      const now = Date.now();
      const rounds = g.rounds.map((r, i) => {
        if (i !== g.roundIndex || r.outcome) return r;
        const outcome = classifyResponse(r, now);
        return { ...r, respondedAt: now, outcome };
      });
      return { ...g, rounds, phase: "waiting" };
    });
  }

  function finishMentalGame(rounds) {
    const summary = summarizeSession(rounds);
    setMhGame((g) => ({ ...g, phase: "done", rounds }));
    setMhStep("quiz");
  }

  function answerMentalQuiz(value) {
    const item = QUIZ_ITEMS[mhQuizIndex];
    const next = { ...mhQuiz, [item.id]: value };
    setMhQuiz(next);
    if (mhQuizIndex + 1 >= QUIZ_ITEMS.length) {
      finishMentalAssessment(next, mhGame.rounds);
    } else {
      setMhQuizIndex(mhQuizIndex + 1);
    }
  }

  async function finishMentalAssessment(answers, rounds) {
    setMhLoading(true);
    try {
      const quiz = scoreQuiz(answers);
      const game = summarizeSession(rounds);
      const suggestions = await getMentalHealthSuggestions(quiz.dominantCategory, 6);
      const result = { quiz, game, suggestions, answeredAt: new Date().toISOString() };
      setMhResult(result);
      setMhStep("result");
      // Persist (non-blocking)
      saveMentalAssessment(currentUser?.uid, result).catch(() => {});
    } finally {
      setMhLoading(false);
    }
  }

  function restartMental() {
    cancelMentalTimers();
    setMhStep("intro");
    setMhGame(makeEmptySessionState());
    setMhQuiz({});
    setMhQuizIndex(0);
    setMhResult(null);
  }

  // ── Nutrition planner handlers ──────────────────────────────
  function handleNutInput(field, value) {
    setNutInput((prev) => ({ ...prev, [field]: value }));
    if (nutErrors[field]) {
      setNutErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function calculateNutrition() {
    setNutCalculating(true);
    setNutErrors({});
    // Tiny delay so the spinner shows even on fast machines
    setTimeout(() => {
      const parsed = {
        weight:        parseFloat(nutInput.weight),
        height:        parseFloat(nutInput.height),
        age:           parseInt(nutInput.age, 10),
        gender:        nutInput.gender,
        exerciseHours: parseFloat(nutInput.exerciseHours) || 0,
        goal:          nutInput.goal
      };
      const r = calculateNutritionPlan(parsed);
      if (!r.ok) {
        setNutErrors(r.errors || {});
        setNutCalculating(false);
        return;
      }
      setNutResult(r);
      setNutStep("result");
      setNutCalculating(false);
    }, 350);
  }

  function restartNutrition() {
    setNutStep("form");
    setNutResult(null);
    setNutErrors({});
  }

  // Load profile + vitals history via dbService (Firestore + localStorage fallback)
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        // Profile
        const userProfile = await getUserProfile(currentUser.uid);
        if (cancelled) return;
        setProfile(
          userProfile || {
            name: currentUser.email?.split("@")[0] || "ব্যবহারকারী",
            age: "N/A",
            bloodGroup: "N/A",
            location: "বাংলাদেশ"
          }
        );

        // Vitals — dbService.getVitalsHistory returns newest-first array
        const records = await getVitalsHistory(currentUser.uid, 30);
        if (cancelled) return;
        if (Array.isArray(records) && records.length > 0) {
          const latest = records[0];
          setVitals({
            temperature: latest.temperature || "36.8",
            bloodPressure: latest.bloodPressure || "120/80",
            oxygen: latest.oxygen || "98",
            heartRate: latest.heartRate || "72"
          });
          setHasTodayEntry(Boolean(latest.date && latest.date === todayIso));
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Toggle reminder completion — persisted via dbService
  async function toggleReminder(id) {
    if (!currentUser) return;
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    const nextDone = !target.done;
    // Optimistic local update so the UI feels instant
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: nextDone } : r))
    );
    try {
      const result = await updateReminder(currentUser.uid, id, { done: nextDone });
      if (!result || !result.ok) {
        console.warn("toggleReminder did not persist, keeping local state.");
      }
    } catch (e) {
      console.error("toggleReminder failed:", e);
    }
  }

  // Delete a reminder — persisted via dbService
  async function handleDeleteReminder(id) {
    if (!currentUser) return;
    // Optimistic removal
    const previous = reminders;
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      const result = await deleteReminder(currentUser.uid, id);
      if (!result || !result.ok) {
        // Roll back if persistence failed
        setReminders(previous);
        console.warn("deleteReminder did not persist, rolled back.");
      }
    } catch (e) {
      console.error("deleteReminder failed:", e);
      setReminders(previous);
    }
  }

  // Handle Logout
  async function handleSignOut() {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error(e);
    }
  }

  // Simulate OCR scanning
  function handleOcrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Image-only validation
    if (!file.type.startsWith("image/")) {
      setOcrStatus("শুধু ছবি ফাইল গ্রহণযোগ্য (JPG/PNG)।");
      setOcrResult(null);
      setOcrProgress(0);
      setOcrError("invalid_type");
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setOcrStatus("ছবি ৮ MB এর বেশি হওয়া যাবে না।");
      setOcrResult(null);
      setOcrProgress(0);
      setOcrError("too_large");
      e.target.value = "";
      return;
    }

    setOcrFileName(file.name);
    setOcrStatus("প্রেসক্রিপশন স্ক্যান করা হচ্ছে...");
    setOcrResult(null);
    setOcrProgress(8);
    setOcrError(null);

    analyzePrescriptionAPI(file, {
      onProgress: (p) => setOcrProgress(p)
    })
      .then((resp) => {
        if (!resp || resp.ok === false) {
          setOcrError(resp?.error || "OCR ব্যর্থ হয়েছে");
          setOcrStatus("স্ক্যান ব্যর্থ — আবার চেষ্টা করুন");
          return;
        }
        setOcrResult(resp);
        const count = resp.medicines?.length || 0;
        setOcrStatus(
          count
            ? `স্ক্যান সম্পন্ন! ${count}টি ওষুধ পাওয়া গেছে।`
            : "কোনো ওষুধ পাওয়া যায়নি — ম্যানুয়ালি যোগ করুন।"
        );
      })
      .catch((err) => {
        console.error("OCR error:", err);
        setOcrError(err?.message || "OCR ব্যর্থ হয়েছে");
        setOcrStatus("স্ক্যান ব্যর্থ — আবার চেষ্টা করুন");
      })
      .finally(() => {
        // Reset input so the same file can be re-selected
        e.target.value = "";
      });
  }

  function handleOcrRetry() {
    setOcrResult(null);
    setOcrError(null);
    setOcrStatus("আবার স্ক্যান করতে নতুন ছবি আপলোড করুন।");
    setOcrProgress(0);
    setOcrFileName("");
  }

  // Add a single OCR-detected medicine to Reminders
  async function addOcrMedicine(med) {
    if (!med || !currentUser) return;
    const newRem = {
      label: `${med.name}${med.dosage ? " " + med.dosage : ""}`,
      time: med.time || "",
      done: false,
      icon: "💊",
      color: "purple",
      source: "ocr"
    };
    try {
      const result = await addReminder(currentUser.uid, newRem);
      if (result && result.ok && result.item) {
        setReminders((prev) => [...prev, result.item]);
      } else {
        setReminders((prev) => [...prev, { id: `local_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, ...newRem }]);
      }
    } catch (e) {
      console.error("addOcrMedicine failed:", e);
      setReminders((prev) => [...prev, { id: `local_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, ...newRem }]);
    }
  }

  // Backwards-compatible wrapper used by the modal's "add all" button.
  async function addOcrReminder() {
    if (!ocrResult) return;
    const meds = ocrResult.medicines || [
      { name: ocrResult.medicine, dosage: ocrResult.dosage, time: ocrResult.time }
    ];
    for (const med of meds) {
      // eslint-disable-next-line no-await-in-loop
      await addOcrMedicine(med);
    }
    setActiveModal(null);
    setOcrResult(null);
    setOcrStatus("");
    setOcrProgress(0);
    setOcrFileName("");
    setOcrError(null);
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div>লোড করা হচ্ছে...</div>
      </div>
    );
  }

  return (
    <div className="scroll-area">
      {/* Profile Header (Blue style) */}
      <div className="profile-hdr">
        <div style={{ position: "relative", display: "inline-block" }}>
          <div className="profile-avatar">
            {photoURL ? (
              <img src={photoURL} alt="profile" className="profile-avatar-img" />
            ) : (
              "👩"
            )}
          </div>
          <button
            type="button"
            className="avatar-upload-btn"
            title="ছবি আপলোড করুন"
            aria-label="ছবি আপলোড করুন"
            onClick={openPhotoPicker}
            disabled={photoUploading}
          >
            {photoUploading ? "…" : "✎"}
          </button>
          {/* Hidden file input controlled by a ref — more reliable than <label><input> on mobile */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />
        </div>
        {photoError && (
          <div
            role="alert"
            style={{
              marginTop: 6,
              background: "rgba(255, 80, 80, 0.18)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 10,
              display: "inline-block",
              maxWidth: 240
            }}
            onClick={() => setPhotoError(null)}
            title="বন্ধ করতে ক্লিক করুন"
          >
            ⚠ {photoError}
          </div>
        )}
        <div className="profile-name">{profile?.name || "ব্যবহারকারী"}</div>
        <div className="profile-age">
          বয়স: {profile?.age || "N/A"} বছর · রক্তের গ্রুপ: {profile?.bloodGroup || "N/A"} · {profile?.location || "বাংলাদেশ"}
        </div>
        <button 
          onClick={handleSignOut} 
          style={{ 
            marginTop: "10px", 
            background: "rgba(255,255,255,0.2)", 
            color: "white", 
            border: "none", 
            borderRadius: "var(--r-xs)",
            padding: "4px 10px",
            fontSize: "9px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          লগআউট করুন
        </button>
      </div>

      {/* Vitals Metrics Grid */}
      {!hasTodayEntry && (
        <div className="empty-vitals-card">
          🩺 আজকের জন্য এখনও কোনো তথ্য যোগ করা হয়নি।
        </div>
      )}

      <div className="metrics-row" style={{marginTop:"10px"}}>
        <div className="metric-pill">
          <div className="metric-val">{vitals.temperature}°C</div>
          <div className="metric-lbl">তাপমাত্রা</div>
        </div>
        <div className="metric-pill">
          {/* Highlight blood pressure if abnormal */}
          <div className={`metric-val ${vitals.bloodPressure !== "120/80" ? "warn" : ""}`}>
            {vitals.bloodPressure}
          </div>
          <div className="metric-lbl">রক্তচাপ</div>
        </div>
        <div className="metric-pill">
          <div className="metric-val">{vitals.oxygen}%</div>
          <div className="metric-lbl">অক্সিজেন</div>
        </div>
      </div>

      {/* Daily Data Entry trigger link */}
      <div style={{ padding: "0 14px 14px" }}>
        <Link
          to="/data-entry"
          style={{
            display: "block",
            textAlign: "center",
            background: "var(--blue)",
            color: "white",
            padding: "10px",
            borderRadius: "var(--r-sm)",
            fontSize: "11px",
            fontWeight: "700",
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(24,95,165,0.2)"
          }}
        >
          📝 আজকের নতুন তথ্য যোগ করুন
        </Link>
      </div>

      {/* Live Weather (OpenWeatherMap) */}
      {weather && (
        <div className="weather-card">
          <div className="weather-icon">
            {weather.description?.toLowerCase().includes("rain") ? "🌧️"
              : weather.description?.toLowerCase().includes("cloud") ? "⛅"
              : weather.description?.toLowerCase().includes("clear") ? "☀️"
              : "🌤️"}
          </div>
          <div className="weather-info">
            <div className="weather-temp">
              {Math.round(weather.temp)}°C
              {weather.source === "fallback" && <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: 6 }}>(আনুমানিক)</span>}
            </div>
            <div className="weather-loc">📍 {weather.city || "আপনার এলাকা"} · {weather.description}</div>
            <div className="weather-meta">
              অনুভূতি: {Math.round(weather.feelsLike)}°C · আর্দ্রতা: {weather.humidity}%
            </div>
          </div>
          {weatherLoading && <div className="spinner" style={{ width: 16, height: 16, borderLeftColor: "#fff" }} />}
        </div>
      )}

      {/* Health Measurement buttons */}
      <div className="section-head">💓 স্বাস্থ্য পরিমাপ</div>
      <div className="measure-row">
        <button className="measure-btn" onClick={() => setActiveModal("heart")}>
          <span className="mb-icon">❤️</span>
          হার্টরেট মাপুন
          <span className="mb-sub">ক্যামেরা PPG</span>
        </button>
        <button className="measure-btn" onClick={() => setActiveModal("blood")}>
          <span className="mb-icon">🩸</span>
          রক্তচাপ দেখুন
          <span className="mb-sub">অনুমান ভিত্তিক</span>
        </button>
      </div>

      {/* Today's Reminders list */}
      <div className="section-head">⏰ আজকের রিমাইন্ডার</div>
      <div className="reminder-list">
        {reminders.map((rem) => (
          <div key={rem.id} className="reminder-row" onClick={() => toggleReminder(rem.id)}>
            <div className={`rem-icon ${rem.color}`}>{rem.icon}</div>
            <div>
              <div className="rem-label">{rem.label}</div>
              <div className="rem-time">{rem.time}</div>
            </div>
            <div className={`rem-check ${rem.done ? "done" : ""}`}>
              {rem.done ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Quick service tools */}
      <div className="section-head">⚡ দ্রুত সেবা</div>
      <div className="quick-tiles">
        <button className="qtile g" onClick={() => setActiveModal("ocr")}>
          <span className="qtile-icon">📋</span>
          প্রেসক্রিপশন স্ক্যান
        </button>
        <button className="qtile p" onClick={() => setActiveModal("mental")}>
          <span className="qtile-icon">🧠</span>
          মানসিক সুস্থতা
        </button>
        <button className="qtile a" onClick={() => setActiveModal("nutrition")}>
          <span className="qtile-icon">🥗</span>
          পুষ্টি পরামর্শ
        </button>
      </div>

      {/* Modals for Quick Services */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* OCR Prescription Scanner Modal */}
            {activeModal === "ocr" && (
              <>
                <div className="modal-title">📋 প্রেসক্রিপশন স্ক্যানার (AI OCR)</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--txt2)" }}>
                    আপনার প্রেসক্রিপশনের ছবি আপলোড করুন। AI স্বয়ংক্রিয়ভাবে ওষুধ শনাক্ত করে রিমাইন্ডার সেট করবে।
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOcrUpload}
                    style={{ fontSize: "10px", margin: "10px 0" }}
                  />

                  {ocrFileName && !ocrResult && (
                    <div style={{ fontSize: "10px", color: "var(--txt2)" }}>
                      ফাইল: {ocrFileName}
                    </div>
                  )}

                  {ocrProgress > 0 && ocrProgress < 100 && !ocrResult && (
                    <div className="ocr-progress">
                      <div className="ocr-progress-bar" style={{ width: `${ocrProgress}%` }} />
                      <div className="ocr-progress-label">{ocrProgress}%</div>
                    </div>
                  )}

                  {ocrStatus && (
                    <div style={{
                      fontWeight: "600",
                      color: ocrError ? "var(--red, #d33)" : "var(--green)"
                    }}>
                      {ocrStatus}
                    </div>
                  )}

                  {ocrError && (
                    <button
                      type="button"
                      onClick={handleOcrRetry}
                      className="ocr-retry-btn"
                    >
                      🔄 আবার স্ক্যান করুন
                    </button>
                  )}

                  {ocrResult && ocrResult.medicines && ocrResult.medicines.length > 0 && (
                    <div className="ocr-result-card">
                      <div className="ocr-result-head">
                        <span>🔍 পাওয়া ওষুধ</span>
                        <span className="ocr-source-badge" data-source={ocrResult.source}>
                          {ocrResult.source === "local" ? "লোকাল" : ocrResult.source}
                        </span>
                      </div>
                      <ul className="ocr-med-list">
                        {ocrResult.medicines.map((med, idx) => (
                          <li key={idx} className="ocr-med-item">
                            <div className="ocr-med-main">
                              <div className="ocr-med-name">💊 {med.name}</div>
                              {med.dosage && <div className="ocr-med-meta">মাত্রা: {med.dosage}</div>}
                              {med.frequency && <div className="ocr-med-meta">ফ্রিকোয়েন্সি: {med.frequency}</div>}
                              {med.time && <div className="ocr-med-meta">সময়: {med.time}</div>}
                            </div>
                            <button
                              type="button"
                              className="ocr-add-one"
                              onClick={() => addOcrMedicine(med)}
                            >
                              + যোগ
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="ocr-add-all"
                        onClick={addOcrReminder}
                      >
                        ✓ সব রিমাইন্ডারে যোগ করুন
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Nutrition Advice Modal (dynamic) */}
            {activeModal === "nutrition" && (
              <>
                <div className="modal-title">🥗 পুষ্টি ও খাদ্য পরামর্শ</div>

                {nutStep === "form" && (
                  <div className="nut-body">
                    <p className="nut-lead">
                      আপনার ওজন, বয়স, লিঙ্গ ও ব্যায়ামের পরিমাণ অনুযায়ী ক্যালোরি ও খাবারের পরিকল্পনা তৈরি হবে।
                    </p>

                    <div className="nut-form-grid">
                      <label className="nut-field">
                        <span>ওজন (কেজি)</span>
                        <input
                          className="nut-input"
                          type="number"
                          inputMode="decimal"
                          min="30" max="200"
                          value={nutInput.weight}
                          onChange={(e) => handleNutInput("weight", e.target.value)}
                          placeholder="যেমন: ৬৫"
                        />
                        {nutErrors.weight && <em className="nut-err">{nutErrors.weight}</em>}
                      </label>

                      <label className="nut-field">
                        <span>উচ্চতা (সেমি)</span>
                        <input
                          className="nut-input"
                          type="number"
                          inputMode="numeric"
                          min="100" max="220"
                          value={nutInput.height}
                          onChange={(e) => handleNutInput("height", e.target.value)}
                          placeholder="যেমন: ১৬৮"
                        />
                        {nutErrors.height && <em className="nut-err">{nutErrors.height}</em>}
                      </label>

                      <label className="nut-field">
                        <span>বয়স (বছর)</span>
                        <input
                          className="nut-input"
                          type="number"
                          inputMode="numeric"
                          min="5" max="100"
                          value={nutInput.age}
                          onChange={(e) => handleNutInput("age", e.target.value)}
                          placeholder="যেমন: ২৮"
                        />
                        {nutErrors.age && <em className="nut-err">{nutErrors.age}</em>}
                      </label>

                      <label className="nut-field">
                        <span>সাপ্তাহিক ব্যায়াম (ঘণ্টা)</span>
                        <input
                          className="nut-input"
                          type="number"
                          inputMode="decimal"
                          min="0" max="25"
                          value={nutInput.exerciseHours}
                          onChange={(e) => handleNutInput("exerciseHours", e.target.value)}
                          placeholder="যেমন: ৩"
                        />
                        {nutErrors.exerciseHours && <em className="nut-err">{nutErrors.exerciseHours}</em>}
                      </label>
                    </div>

                    <div className="nut-radio-group">
                      <span className="nut-radio-label">লিঙ্গ</span>
                      <div className="nut-radio-options">
                        {GENDER_OPTIONS.map((g) => (
                          <button
                            type="button"
                            key={g.id}
                            className={"nut-radio" + (nutInput.gender === g.id ? " active" : "")}
                            onClick={() => handleNutInput("gender", g.id)}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="nut-radio-group">
                      <span className="nut-radio-label">আপনার লক্ষ্য</span>
                      <div className="nut-radio-options">
                        {GOAL_OPTIONS.map((g) => (
                          <button
                            type="button"
                            key={g.id}
                            className={"nut-radio" + (nutInput.goal === g.id ? " active" : "")}
                            onClick={() => handleNutInput("goal", g.id)}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="nut-actions">
                      <button
                        className="nut-cta"
                        onClick={calculateNutrition}
                        disabled={nutCalculating}
                      >
                        {nutCalculating ? "হিসাব হচ্ছে…" : "🍽️ পরিকল্পনা দেখুন"}
                      </button>
                    </div>
                  </div>
                )}

                {nutStep === "result" && nutResult && (
                  <div className="nut-body">
                    <div className={"nut-bmi-banner nut-bmi-" + nutResult.bmiCategory.color}>
                      BMI: <b>{nutResult.bmi}</b> ({nutResult.bmiCategory.label})
                    </div>

                    <div className="nut-stats">
                      <div className="nut-stat">
                        <span className="nut-stat-label">BMR</span>
                        <span className="nut-stat-value">{nutResult.bmr}</span>
                        <span className="nut-stat-unit">কিলোক্যালরি</span>
                      </div>
                      <div className="nut-stat">
                        <span className="nut-stat-label">TDEE</span>
                        <span className="nut-stat-value">{nutResult.tdee}</span>
                        <span className="nut-stat-unit">কিলোক্যালরি</span>
                      </div>
                      <div className="nut-stat nut-stat-target">
                        <span className="nut-stat-label">লক্ষ্য</span>
                        <span className="nut-stat-value">{nutResult.targetKcal}</span>
                        <span className="nut-stat-unit">কিলোক্যালরি/দিন</span>
                      </div>
                      <div className="nut-stat">
                        <span className="nut-stat-label">পানি</span>
                        <span className="nut-stat-value">{nutResult.waterIntake}</span>
                        <span className="nut-stat-unit">লিটার/দিন</span>
                      </div>
                    </div>

                    <div className="nut-macros">
                      <span>প্রোটিন: <b>{nutResult.macros.protein} গ্রাম</b></span>
                      <span>শর্করা: <b>{nutResult.macros.carbs} গ্রাম</b></span>
                      <span>চর্বি: <b>{nutResult.macros.fat} গ্রাম</b></span>
                    </div>

                    <div className="nut-context">
                      <small>
                        কার্যকলাপ: {nutResult.activity.label} • লক্ষ্য: {nutResult.goal.label} ({nutResult.goal.adjust > 0 ? "+" : ""}{nutResult.goal.adjust} কিলোক্যালরি)
                      </small>
                    </div>

                    <div className="nut-tips">
                      {nutResult.tips.map((t, i) => (
                        <div key={i} className="nut-tip">💡 {t}</div>
                      ))}
                    </div>

                    <h4 className="nut-section-title">🍽️ আজকের খাবার পরিকল্পনা</h4>

                    {nutResult.mealOrder.map((mealKey) => {
                      const data = nutResult.meals[mealKey];
                      if (!data || data.items.length === 0) return null;
                      const meta = {
                        breakfast: { label: "সকালের নাস্তা", icon: "🌅", pct: 25 },
                        lunch:     { label: "দুপুরের খাবার",  icon: "🍛", pct: 35 },
                        snack:     { label: "বিকেলের নাস্তা", icon: "🥪", pct: 10 },
                        dinner:    { label: "রাতের খাবার",    icon: "🌙", pct: 30 }
                      }[mealKey];
                      return (
                        <div key={mealKey} className="nut-meal-group">
                          <div className="nut-meal-head">
                            <span className="nut-meal-icon">{meta.icon}</span>
                            <span className="nut-meal-label">{meta.label}</span>
                            <span className="nut-meal-budget">
                              {data.totals.kcal} / {data.budget} কিলোক্যালরি ({meta.pct}%)
                            </span>
                          </div>
                          <ul className="nut-food-list">
                            {data.items.map((it) => (
                              <li key={it.id} className="nut-food-item">
                                <div className="nut-food-main">
                                  <span className="nut-food-name">
                                    {it.name}
                                  </span>
                                  <span className="nut-food-portion">{it.portion}</span>
                                </div>
                                <div className="nut-food-macros">
                                  <span className="nut-food-kcal">{it.kcal} কিলো</span>
                                  <span className="nut-food-macro">P {it.protein}</span>
                                  <span className="nut-food-macro">C {it.carbs}</span>
                                  <span className="nut-food-macro">F {it.fat}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}

                    <div className="nut-actions">
                      <button className="nut-cta nut-cta-secondary" onClick={restartNutrition}>
                        ↻ নতুন হিসাব করুন
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Mental Health Self-Check Modal */}
            {activeModal === "mental" && (
              <>
                <div className="modal-title">🧠 মানসিক সুস্থতা স্ব-পরীক্ষা</div>
                <div className="mh-body">
                  {mhStep === "intro" && (
                    <div className="mh-intro">
                      <p className="mh-lead">
                        একটি ছোট ব্রেইন-গেম এবং ১২টি প্রশ্নের মাধ্যমে আপনার
                        বর্তমান মানসিক অবস্থা বুঝতে সাহায্য করবো। আপনার
                        উত্তরগুলো গোপন থাকবে এবং ডাটাবেস থেকে সঠিক
                        পরামর্শ দেওয়া হবে।
                      </p>
                      <ul className="mh-list">
                        <li>🎯 <b>রিঅ্যাকশন গেম:</b> সবুজ বৃত্ত দেখলে দ্রুত ট্যাপ করুন</li>
                        <li>📝 <b>ছোট কুইজ:</b> গত ৭ দিনের অনুভূতি</li>
                        <li>💡 <b>ব্যক্তিগত পরামর্শ:</b> ১০০+ পরামর্শের ডাটাবেস থেকে</li>
                      </ul>
                      <p className="mh-disclaimer">
                        ⚠ এটি চিকিৎসা পরামর্শ নয়। গুরুতর সমস্যা হলে
                        হেল্পলাইনে যোগাযোগ করুন।
                      </p>
                      <div className="mh-actions">
                        <button className="mh-primary" onClick={startMentalGame}>
                          শুরু করুন →
                        </button>
                      </div>
                    </div>
                  )}

                  {mhStep === "game" && (
                    <div className="mh-game">
                      <div className="mh-game-progress">
                        রাউন্ড {Math.min(mhGame.roundIndex + 1, GAME_CONFIG.totalRounds)} / {GAME_CONFIG.totalRounds}
                      </div>
                      <div className="mh-game-stage">
                        {mhGame.phase === "waiting" && (
                          <div className="mh-game-hint">
                            <div className="mh-game-pulse" />
                            <p>সবুজ বৃত্তের জন্য অপেক্ষা করুন...</p>
                          </div>
                        )}
                        {mhGame.phase === "live" && (
                          <button
                            className="mh-game-target"
                            onClick={tapMentalTarget}
                            aria-label="টার্গেট"
                            style={{ background: GAME_CONFIG.targetColor }}
                          />
                        )}
                      </div>
                      <p className="mh-game-foot">
                        যত দ্রুত পারেন ট্যাপ করুন, কিন্তু সবুজ দেখা
                        মাত্রই — আগে ট্যাপ করলে পয়েন্ট কাটা যাবে।
                      </p>
                    </div>
                  )}

                  {mhStep === "quiz" && mhLoading && (
                    <div className="mh-loading">আপনার উত্তর বিশ্লেষণ হচ্ছে…</div>
                  )}

                  {mhStep === "quiz" && !mhLoading && (() => {
                    const item = QUIZ_ITEMS[mhQuizIndex];
                    if (!item) return null;
                    return (
                      <div className="mh-quiz">
                        <div className="mh-quiz-progress">
                          প্রশ্ন {mhQuizIndex + 1} / {QUIZ_ITEMS.length}
                        </div>
                        <div className="mh-quiz-progress-bar">
                          <div
                            className="mh-quiz-progress-fill"
                            style={{ width: ((mhQuizIndex) / QUIZ_ITEMS.length) * 100 + "%" }}
                          />
                        </div>
                        <div className="mh-quiz-question">{item.text}</div>
                        <div className="mh-quiz-options">
                          {QUIZ_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              className="mh-quiz-option"
                              onClick={() => answerMentalQuiz(opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {mhStep === "result" && mhResult && (
                    <div className="mh-result">
                      <div className="mh-result-headline">
                        <div className="mh-result-cat">
                          🪞 প্রধান উদ্বেগ:&nbsp;
                          <b>{mhResult.quiz.categoryLabel}</b>
                          <span className={"mh-intensity mh-intensity-" + mhResult.quiz.intensity}>
                            &nbsp;{intensityBn(mhResult.quiz.intensity)}
                          </span>
                        </div>
                        <div className="mh-result-brain">
                          🧠 ব্রেইন স্কোর: <b>{mhResult.game.brainScore}</b>/100 · {mhResult.game.focusRating}
                        </div>
                      </div>

                      <div className="mh-result-meters">
                        <Meter label="সুস্থতা" value={mhResult.quiz.wellbeing} color="green" />
                        <Meter label="উদ্বেগ" value={mhResult.quiz.risk.anxious} color="purple" />
                        <Meter label="চাপ" value={mhResult.quiz.risk.stressed} color="red" />
                        <Meter label="বিষণ্ণতা" value={mhResult.quiz.risk.sad} color="blue" />
                      </div>

                      <div className="mh-suggestions-title">
                        💡 আপনার জন্য পরামর্শ ({mhResult.suggestions.length} টি)
                      </div>
                      <ul className="mh-suggestions">
                        {mhResult.suggestions.map((s) => (
                          <li key={s.id} className={"mh-suggestion tag-" + s.category}>
                            <div className="mh-suggestion-head">
                              <span className="mh-suggestion-title">{s.title}</span>
                              <span className="mh-suggestion-tag">{s.tag}</span>
                            </div>
                            <div className="mh-suggestion-body">{s.body}</div>
                            <div className="mh-suggestion-time">⏱ {s.duration}</div>
                          </li>
                        ))}
                      </ul>

                      <div className="mh-actions">
                        <button className="mh-secondary" onClick={restartMental}>
                          ↻ আবার করুন
                        </button>
                        <button className="mh-primary" onClick={closeModal}>
                          ✓ শেষ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Heart Rate Measurement Modal (PPG camera-based) */}
            {activeModal === "heart" && (
              <>
                <div className="modal-title">❤️ হার্টরেট মাপুন (PPG)</div>
                <div className="measure-instructions">
                  📱 আঙুলটি রিয়ার ক্যামেরার লেন্সের উপর হালকাভাবে রাখুন এবং ফ্ল্যাশ জ্বলতে দিন।
                  ৩০ সেকেন্ড স্থির থাকুন। এটি কোনো চিকিৎসা পরামর্শ নয়。
                </div>
                <video ref={hrVideoRef} className="measure-video" autoPlay playsInline muted />

                {hrState.status === "idle" && (
                  <button className="measure-start-btn" onClick={startHeartRate}>
                    ▶ পরিমাপ শুরু করুন (৩০ সেকেন্ড)
                  </button>
                )}

                {hrState.status === "measuring" && (
                  <div className="measure-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${hrState.progress}%` }} />
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--txt2)", marginTop: "6px" }}>
                      সময়: {Math.round(hrState.elapsed / 1000)} সে / 30 সে
                      {hrState.bpm ? ` · লাইভ BPM: ${hrState.bpm}` : ""}
                    </div>
                  </div>
                )}

                {hrState.status === "done" && (
                  <div className="measure-result">
                    <div style={{ fontSize: "11px", color: "var(--txt2)" }}>আপনার আনুমানিক হার্টরেট</div>
                    <div className="result-bpm">{hrState.bpm} BPM</div>
                    <button
                      className="measure-start-btn"
                      onClick={startHeartRate}
                      style={{ background: "var(--blue)", marginTop: "6px" }}
                    >
                      🔁 আবার পরিমাপ করুন
                    </button>
                  </div>
                )}

                {hrState.status === "error" && (
                  <div className="measure-result" style={{ background: "#fee", color: "#c33" }}>
                    ❌ ক্যামেরা অ্যাক্সেস প্রয়োজন। অনুগ্রহ করে ক্যামেরা পারমিশন দিন。
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>{hrState.error}</div>
                  </div>
                )}
              </>
            )}

            {/* Blood Pressure (estimated from HR + HRV) Modal */}
            {activeModal === "blood" && (
              <>
                <div className="modal-title">🩸 রক্তচাপ অনুমান (Heart Rate + HRV ভিত্তিক)</div>
                <div className="measure-instructions">
                  🩺 প্রথমে হার্টরেট পরিমাপ করুন। ফলাফল থেকে রক্তচাপ আনুমানিক হিসাব করা হবে。
                  <br />
                  <em style={{ color: "var(--txt2)" }}>
                    দ্রষ্টব্য: এটি কোনো মেডিকেল যন্ত্র নয়, শুধুমাত্র সাধারণ ধারণার জন্য。
                  </em>
                </div>

                {bloodState.status === "idle" && (
                  <button
                    className="measure-start-btn"
                    onClick={startBloodPressure}
                    disabled={bloodState.busy}
                  >
                    {bloodState.busy ? "⏳ প্রসেসিং..." : "▶ পরিমাপ শুরু করুন"}
                  </button>
                )}

                {bloodState.status === "done" && (
                  <div className="measure-result">
                    <div className="bp-result-grid">
                      <div className="bp-stat">
                        <div className="bp-val">{bloodState.systolic}</div>
                        <div className="bp-lbl">সিস্টোলিক (উপরের)</div>
                      </div>
                      <div className="bp-divider">/</div>
                      <div className="bp-stat">
                        <div className="bp-val">{bloodState.diastolic}</div>
                        <div className="bp-lbl">ডায়াস্টোলিক (নিচের)</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--txt2)", marginTop: "6px" }}>
                      HR: {bloodState.hr} BPM · HRV: {bloodState.hrv} ms
                    </div>
                    <button
                      className="measure-start-btn"
                      onClick={startBloodPressure}
                      style={{ background: "var(--blue)", marginTop: "8px" }}
                    >
                      🔁 আবার পরিমাপ করুন
                    </button>
                  </div>
                )}

                {bloodState.status === "error" && (
                  <div className="measure-result" style={{ background: "#fee", color: "#c33" }}>
                    ❌ পরিমাপ করা যায়নি। আবার চেষ্টা করুন。
                  </div>
                )}
              </>
            )}

            <button className="modal-close-btn" onClick={closeModal}>বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
}
