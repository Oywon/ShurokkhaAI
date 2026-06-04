import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

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

  const moods = ["ভালো আছি", "দুর্বল", "মাথাব্যথা", "জ্বর", "বমি", "ক্লান্ত"];
  
  // Format Today's Date in Bengali (e.g. "৪ জুন, ২০২৬")
  const today = new Date();
  const formatBnDate = (date) => {
    const monthsBn = [
      "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
      "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
    ];
    const convertToBnDigits = (num) => {
      const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return num.toString().split("").map(d => bnDigits[parseInt(d, 10)] || d).join("");
    };
    return `${convertToBnDigits(date.getDate())} ${monthsBn[date.getMonth()]}, ${convertToBnDigits(date.getFullYear())}`;
  };

  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  // Fetch today's existing log or profile details
  useEffect(() => {
    async function fetchTodayData() {
      if (!currentUser) return;
      try {
        let userProfile = null;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            userProfile = userDoc.data();
          }
        } catch (error) {
          console.warn("Firestore profile fetch failed, using local fallback:", error.message);
        }

        if (!userProfile) {
          const localProf = localStorage.getItem("mock_user_profile");
          if (localProf) {
            userProfile = JSON.parse(localProf);
          } else {
            userProfile = { name: "রাহেলা বেগম" };
          }
        }
        setProfile(userProfile);

        // Fetch today's vitals document if exists
        let todayData = null;
        const docId = `${currentUser.uid}_${todayStr}`;
        try {
          const vitalsDoc = await getDoc(doc(db, "vitals", docId));
          if (vitalsDoc.exists()) {
            todayData = vitalsDoc.data();
          }
        } catch (vitalsErr) {
          console.warn("Firestore vitals fetch failed, using local fallback:", vitalsErr.message);
        }

        if (!todayData) {
          const localHistory = localStorage.getItem("mock_vitals_history");
          if (localHistory) {
            const list = JSON.parse(localHistory);
            todayData = list.find((item) => item.date === todayStr) || null;
          }
        }

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
    const docId = `${currentUser.uid}_${todayStr}`;
    const vitalsPayload = {
      userId: currentUser.uid,
      date: todayStr,
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
      await setDoc(doc(db, "vitals", docId), {
        ...vitalsPayload,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore vitals write failed, saving to LocalStorage:", err.message);
      let list = JSON.parse(localStorage.getItem("mock_vitals_history") || "[]");
      // Filter out today's existing log and push the new one
      list = list.filter((item) => item.date !== todayStr);
      list.push({
        ...vitalsPayload,
        updatedAt: new Date().toISOString()
      });
      localStorage.setItem("mock_vitals_history", JSON.stringify(list));
    } finally {
      setSaving(false);
      navigate("/profile");
    }
  }

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
        <div className="section-head">❤️ গুরুত্বপূর্ণ শারীরিক তথ্য</div>
        <div className="vital-grid">
          
          <div className="vital-card">
            <div className="vital-lbl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              তাপমাত্রা
            </div>
            <input 
              type="text" 
              className="vital-inp" 
              value={temperature} 
              onChange={(e) => setTemperature(e.target.value)}
              required
            />
            <div className="vital-unit">°সেলসিয়াস</div>
          </div>

          <div className="vital-card">
            <div className="vital-lbl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              রক্তচাপ
            </div>
            <input 
              type="text" 
              className="vital-inp" 
              value={bloodPressure} 
              onChange={(e) => setBloodPressure(e.target.value)}
              required
            />
            <div className="vital-unit">mmHg</div>
          </div>

          <div className="vital-card">
            <div className="vital-lbl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="1.8"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M9 9h.01M15 9h.01" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              অক্সিজেন
            </div>
            <input 
              type="number" 
              className="vital-inp" 
              value={oxygen} 
              onChange={(e) => setOxygen(e.target.value)}
              required
            />
            <div className="vital-unit">% SpO₂</div>
          </div>

          <div className="vital-card">
            <div className="vital-lbl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              হার্ট রেট
            </div>
            <input 
              type="number" 
              className="vital-inp" 
              value={heartRate} 
              onChange={(e) => setHeartRate(e.target.value)}
              required
            />
            <div className="vital-unit">bpm</div>
          </div>

        </div>

        {/* Mood Section */}
        <div className="section-head">😊 আজকের অনুভূতি</div>
        <div className="mood-chips">
          {moods.map((m) => (
            <div 
              key={m} 
              className={`mood-chip ${selectedMood === m ? "sel" : "def"}`}
              onClick={() => setSelectedMood(m)}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Medicine Checklist */}
        <div className="section-head">💊 ওষুধ সেবন</div>
        <div className="med-list">
          <div className="med-row" onClick={() => setMeds(prev => ({ ...prev, paracetamol: !prev.paracetamol }))}>
            <div className={meds.paracetamol ? "med-check-done" : "med-check-empty"}>
              {meds.paracetamol ? "✓" : ""}
            </div>
            <div className="med-label">প্যারাসিটামল ৫০০মি.গ্রা.</div>
            <div className={meds.paracetamol ? "med-status-done" : "med-status-empty"}>
              {meds.paracetamol ? "খেয়েছি ✓" : "বাকি আছে"}
            </div>
          </div>

          <div className="med-row" onClick={() => setMeds(prev => ({ ...prev, metformin: !prev.metformin }))}>
            <div className={meds.metformin ? "med-check-done" : "med-check-empty"}>
              {meds.metformin ? "✓" : ""}
            </div>
            <div className="med-label">মেটফর্মিন ৫০০মি.গ্রা.</div>
            <div className={meds.metformin ? "med-status-done" : "med-status-empty"}>
              {meds.metformin ? "খেয়েছি ✓" : "বাকি আছে"}
            </div>
          </div>
        </div>

        {/* Water Track Section */}
        <div className="section-head">💧 পানি পান</div>
        <div className="water-row">
          <div className="water-label">গ্লাস পান করেছি</div>
          <div className="water-ctrl">
            <button 
              type="button" 
              className="w-btn minus" 
              onClick={() => setWaterGlasses(prev => Math.max(0, prev - 1))}
            >
              −
            </button>
            <div className="w-count">{waterGlasses}</div>
            <button 
              type="button" 
              className="w-btn plus" 
              onClick={() => setWaterGlasses(prev => prev + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Save Button Strip at bottom */}
      <div className="save-bar">
        <button type="submit" className="auth-btn-primary" disabled={saving}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 21 17 13 7 13 7 21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7 3 7 8 15 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {saving ? "সংরক্ষণ করা হচ্ছে..." : "তথ্য সংরক্ষণ করুন"}
        </button>
      </div>
    </form>
  );
}
