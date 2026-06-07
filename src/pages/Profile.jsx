import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
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
  const [loading, setLoading] = useState(true);

  // Fetch Profile & Vitals from Firestore
  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      try {
        // Fetch User Info
        let userProfile = null;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            userProfile = userDoc.data();
          }
        } catch (error) {
          console.warn("Firestore profile read failed, attempting LocalStorage fallback:", error.message);
        }

        if (!userProfile) {
          const localProf = localStorage.getItem("mock_user_profile");
          if (localProf) {
            userProfile = JSON.parse(localProf);
          } else {
            userProfile = {
              name: "রাহেলা বেগম",
              age: 42,
              bloodGroup: "B+",
              location: "ঢাকা — মিরপুর"
            };
          }
        }
        setProfile(userProfile);

        // Fetch Vitals (in-memory sort to avoid index requirement)
        let records = [];
        try {
          const vitalsQuery = query(collection(db, "vitals"), where("userId", "==", currentUser.uid));
          const snap = await getDocs(vitalsQuery);
          snap.forEach((doc) => records.push(doc.data()));
        } catch (vitalsErr) {
          console.warn("Firestore vitals read failed, attempting LocalStorage fallback:", vitalsErr.message);
        }

        if (records.length === 0) {
          const localHistory = localStorage.getItem("mock_vitals_history");
          if (localHistory) {
            records = JSON.parse(localHistory).map(r => ({
              ...r,
              updatedAt: { toMillis: () => new Date(r.updatedAt).getTime() }
            }));
          }
        }
        
        if (records.length > 0) {
          // Sort by updatedAt descending
          records.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis() || 0;
            const timeB = b.updatedAt?.toMillis() || 0;
            return timeB - timeA;
          });
          const latest = records[0];
          setVitals({
            temperature: latest.temperature || "36.8",
            bloodPressure: latest.bloodPressure || "120/80",
            oxygen: latest.oxygen || "98",
            heartRate: latest.heartRate || "72"
          });
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  // Toggle reminder completion
  function toggleReminder(id) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
    );
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

    setOcrStatus("প্রেসক্রিপশন স্ক্যান করা হচ্ছে... (OCR চালু)");
    setOcrResult(null);

    setTimeout(() => {
      setOcrStatus("স্ক্যান সম্পন্ন! ওষুধ পাওয়া গেছে।");
      setOcrResult({
        medicine: "মেটফর্মিন ৫০০মি.গ্রা.",
        dosage: "১-০-১ (খাবার পর)",
        time: "রাত ৯:০০"
      });
    }, 2500);
  }

  // Add OCR Medicine to Reminders
  function addOcrReminder() {
    if (!ocrResult) return;
    const newRem = {
      id: Date.now(),
      label: ocrResult.medicine,
      time: ocrResult.time,
      done: false,
      icon: "💊",
      color: "purple"
    };
    setReminders((prev) => [...prev, newRem]);
    setActiveModal(null);
    setOcrResult(null);
    setOcrStatus("");
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
        <div className="profile-avatar">👩</div>
        <div className="profile-name">{profile?.name || "ব্যবহারকারী"}</div>
        <div className="profile-age">
          বয়স: {profile?.age || "N/A"} বছর · রক্তের গ্রুপ: {profile?.bloodGroup || "N/A"} · {profile?.location || "বাংলাদেশ"}
        </div>
        <div className="profile-phone">
          যোগাযোগ: {currentUser?.email || currentUser?.phoneNumber || profile?.phone || "N/A"}
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
      <div className="metrics-row">
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
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* OCR Prescription Scanner Modal */}
            {activeModal === "ocr" && (
              <>
                <div className="modal-title">📋 প্রেসক্রিপশন স্ক্যানার (AI OCR)</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ color: "var(--txt2)" }}>
                    আপনার প্রেসক্রিপশনের ছবি আপলোড করুন। AI স্বয়ংক্রিয়ভাবে ওষুধ শনাক্ত করে রিমাইন্ডার সেট করবে।
                  </p>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleOcrUpload} 
                    style={{ fontSize: "10px", margin: "10px 0" }} 
                  />

                  {ocrStatus && (
                    <div style={{ fontWeight: "600", color: "var(--green)" }}>{ocrStatus}</div>
                  )}

                  {ocrResult && (
                    <div style={{
                      background: "var(--bg2)", 
                      border: "1px solid var(--border)", 
                      borderRadius: "var(--r-xs)", 
                      padding: "8px",
                      marginTop: "5px"
                    }}>
                      <div><strong>ওষুধ:</strong> {ocrResult.medicine}</div>
                      <div><strong>মাত্রা:</strong> {ocrResult.dosage}</div>
                      <div><strong>সময়:</strong> {ocrResult.time}</div>
                      <button 
                        onClick={addOcrReminder}
                        style={{
                          width: "100%",
                          background: "var(--green)",
                          color: "white",
                          border: "none",
                          padding: "6px",
                          borderRadius: "var(--r-xs)",
                          fontWeight: "700",
                          marginTop: "8px",
                          cursor: "pointer"
                        }}
                      >
                        ✓ রিমাইন্ডারে যোগ করুন
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mental Wellness Advice Modal */}
            {activeModal === "mental" && (
              <>
                <div className="modal-title">🧠 মানসিক সুস্থতা ও স্ট্রেস রিলীফ</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p>আপনার মন কেমন আছে? স্ট্রেস বা ক্লান্তি কাটাতে আমাদের পরামর্শ:</p>
                  <div style={{ background: "var(--purple-light)", padding: "10px", borderRadius: "var(--r-xs)" }}>
                    <strong>🧘 বুক ব্রিদিং (শ্বাস-প্রশ্বাসের ব্যায়াম):</strong>
                    <p style={{ color: "var(--txt2)", marginTop: "4px" }}>
                      ৪ সেকেন্ড বুক ফুলিয়ে শ্বাস নিন, ৪ সেকেন্ড ধরে রাখুন এবং ৬ সেকেন্ডে ধীরে ধীরে শ্বাস ছাড়ুন। এটি ৩-৫ বার করুন।
                    </p>
                  </div>
                  <div style={{ background: "var(--purple-light)", padding: "10px", borderRadius: "var(--r-xs)" }}>
                    <strong>🌿 প্রকৃতি সংযোগ:</strong>
                    <p style={{ color: "var(--txt2)", marginTop: "4px" }}>
                      ১০ মিনিটের জন্য সব স্ক্রিন বন্ধ করে সবুজ গাছপালার দিকে তাকিয়ে থাকুন অথবা বারান্দায় বুক ভরে বাতাস নিন।
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Nutrition Advice Modal */}
            {activeModal === "nutrition" && (
              <>
                <div className="modal-title">🥗 পুষ্টি ও খাদ্য পরামর্শ</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p>সুস্থ থাকার জন্য আজকের খাদ্য তালিকা নির্বাচন করুন:</p>
                  <div style={{ background: "var(--amber-light)", padding: "10px", borderRadius: "var(--r-xs)" }}>
                    <strong>💧 ডিহাইড্রেশন এড়াতে:</strong>
                    <p style={{ color: "var(--txt2)", marginTop: "4px" }}>
                      প্রচুর পানি, ডাবের পানি বা স্যালাইন পান করুন। অতিরিক্ত ক্যাফেইন জাতীয় পানীয় এড়িয়ে চলুন।
                    </p>
                  </div>
                  <div style={{ background: "var(--amber-light)", padding: "10px", borderRadius: "var(--r-xs)" }}>
                    <strong>🥬 ভিটামিন ও খনিজ:</strong>
                    <p style={{ color: "var(--txt2)", marginTop: "4px" }}>
                      খাবারে মৌসুমি ফল (যেমন: আম, লিচু, লেবু) এবং সবুজ শাকসবজি বেশি রাখুন, যা রোগ প্রতিরোধ ক্ষমতা বাড়াবে।
                    </p>
                  </div>
                </div>
              </>
            )}

            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
}
