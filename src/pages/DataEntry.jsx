import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, getTodayVitals, saveTodayVitals } from "../firebase/dbService";
import { useNavigate, Link } from "react-router-dom";

import VitalCard from "../components/dataEntry/VitalCard";
import MoodSelector from "../components/dataEntry/MoodSelector";
import MedicationRow from "../components/dataEntry/MedicationRow";
import WaterTracker from "../components/dataEntry/WaterTracker";
import SectionHead from "../components/dataEntry/SectionHead";
import SaveBar from "../components/dataEntry/SaveBar";
import { formatBnDate, todayIsoDate, MOODS } from "../components/dataEntry/formatBnDate";

// Small inline SVG icons (kept here so the page is self-contained)
const TempIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const BpIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polyline
      points="22 12 18 12 15 21 9 3 6 12 2 12"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const O2Icon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 9h.01M15 9h.01" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const HrIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function DataEntry() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [temperature, setTemperature] = useState("36.8");
  const [bloodPressure, setBloodPressure] = useState("120/80");
  const [oxygen, setOxygen] = useState("98");
  const [heartRate, setHeartRate] = useState("72");
  
  const [selectedMood, setSelectedMood] = useState("ভালো আছি");
  const [meds, setMeds] = useState({
    paracetamol: true,
    metformin: false
  });
  const [waterGlasses, setWaterGlasses] = useState(5);
  const [saving, setSaving] = useState(false);

  const moods = MOODS;

  const today = new Date();
  const todayStr = todayIsoDate(today);

  // Fetch today's existing log or profile details
  useEffect(() => {
    async function fetchTodayData() {
      if (!currentUser) return;
      try {
        let userProfile = await getUserProfile(currentUser.uid);
        if (!userProfile) {
          userProfile = { name: currentUser.email?.split("@")[0] || "অতিথি" };
        }
        setProfile(userProfile);

        // Fetch today's vitals document if exists
        const todayData = await getTodayVitals(currentUser.uid, todayStr);

        if (todayData) {
          setTemperature(todayData.temperature || "36.8");
          setBloodPressure(todayData.bloodPressure || "120/80");
          setOxygen(todayData.oxygen || "98");
          setHeartRate(todayData.heartRate || "72");
          setSelectedMood(todayData.mood || "ভালো আছি");
          setWaterGlasses(todayData.waterGlasses || 5);
          if (todayData.medications) {
            setMeds({
              paracetamol: !!todayData.medications.Paracetamol,
              metformin: !!todayData.medications.Metformin
            });
          }
        }
      } catch (err) {
        console.error("Error loading today's entry data:", err);
      }
    }
    fetchTodayData();
  }, [currentUser, todayStr]);

  // Save/Update daily vitals log
  async function handleSave(e) {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    const vitalsPayload = {
      temperature,
      bloodPressure,
      oxygen: parseInt(oxygen, 10) || 98,
      heartRate: parseInt(heartRate, 10) || 72,
      mood: selectedMood,
      waterGlasses,
      medications: {
        Paracetamol: meds.paracetamol,
        Metformin: meds.metformin
      }
    };

    try {
      await saveTodayVitals(currentUser.uid, todayStr, vitalsPayload);
    } catch (err) {
      console.error("Failed to save vitals:", err);
    } finally {
      setSaving(false);
      setShowSaved(true);
      // Briefly show the success toast, then go back to Profile
      setTimeout(() => navigate("/profile"), 1500);
    }
  }

  const handleAddWater = () => setWaterGlasses((prev) => prev + 1);
  const handleRemoveWater = () => setWaterGlasses((prev) => Math.max(0, prev - 1));

  // Quick "is this value in a worrying range?" checks used to flag the card.
  const tempNum = parseFloat(temperature);
  const o2Num = parseInt(oxygen, 10);
  const hrNum = parseInt(heartRate, 10);
  const tempAbnormal = !Number.isNaN(tempNum) && (tempNum < 35 || tempNum > 38);
  const o2Abnormal = !Number.isNaN(o2Num) && o2Num < 94;
  const hrAbnormal = !Number.isNaN(hrNum) && (hrNum < 50 || hrNum > 110);
  const bpAbnormal = (() => {
    const m = String(bloodPressure).split("/");
    if (m.length !== 2) return false;
    const s = parseInt(m[0], 10);
    const d = parseInt(m[1], 10);
    if (Number.isNaN(s) || Number.isNaN(d)) return false;
    return s < 90 || s > 140 || d < 60 || d > 90;
  })();

  const [showSaved, setShowSaved] = useState(false);

  return (
    <form onSubmit={handleSave} className="scroll-area" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header (Blue style with back arrow) */}
      <div className="hdr blue">
        <div className="hdr-row">
          <Link to="/profile" className="hdr-back">‹</Link>
          <div>
            <div className="hdr-title">আজকের স্বাস্থ্য তথ্য</div>
            <div className="hdr-sub">{formatBnDate(today)} — {profile?.name || "লোড হচ্ছে..."}</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {/* Vitals Inputs */}
        <SectionHead icon="❤️" title="গুরুত্বপূর্ণ শারীরিক তথ্য" />
        <div className="vital-grid">
          <VitalCard
            label="তাপমাত্রা"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            type="text"
            unit="°সেলসিয়াস"
            icon={TempIcon}
            required
            abnormal={tempAbnormal}
          />
          <VitalCard
            label="রক্তচাপ"
            value={bloodPressure}
            onChange={(e) => setBloodPressure(e.target.value)}
            type="text"
            unit="mmHg"
            icon={BpIcon}
            required
            abnormal={bpAbnormal}
          />
          <VitalCard
            label="অক্সিজেন"
            value={oxygen}
            onChange={(e) => setOxygen(e.target.value)}
            type="number"
            unit="% SpO₂"
            icon={O2Icon}
            required
            inputMode="numeric"
            abnormal={o2Abnormal}
          />
          <VitalCard
            label="হার্ট রেট"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            type="number"
            unit="bpm"
            icon={HrIcon}
            required
            inputMode="numeric"
            abnormal={hrAbnormal}
          />
        </div>

        {/* Mood Section */}
        <SectionHead icon="😊" title="আজকের অনুভূতি" />
        <MoodSelector moods={moods} selected={selectedMood} onSelect={setSelectedMood} />

        {/* Medicine Checklist */}
        <SectionHead icon="💊" title="ওষুধ সেবন" />
        <div className="med-list">
          <MedicationRow
            label="প্যারাসিটামল ৫০০মি.গ্রা."
            taken={meds.paracetamol}
            onToggle={() =>
              setMeds((prev) => ({ ...prev, paracetamol: !prev.paracetamol }))
            }
          />
          <MedicationRow
            label="মেটফর্মিন ৫০০মি.গ্রা."
            taken={meds.metformin}
            onToggle={() =>
              setMeds((prev) => ({ ...prev, metformin: !prev.metformin }))
            }
          />
        </div>

        {/* Water Track Section */}
        <SectionHead icon="💧" title="পানি পান" />
        <WaterTracker
          count={waterGlasses}
          onInc={handleAddWater}
          onDec={handleRemoveWater}
        />
      </div>

      {/* Save Button Strip at bottom */}
      <SaveBar saving={saving} />

      {showSaved && (
        <div className="save-toast" role="status" aria-live="polite">
          ✓ আজকের তথ্য সংরক্ষণ হয়েছে
        </div>
      )}
    </form>
  );
}
