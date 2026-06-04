import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function Home() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sosStatus, setSosStatus] = useState("");
  const [sendingSos, setSendingSos] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (currentUser) {
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
      }
    }
    fetchProfile();
  }, [currentUser]);

  function handleSosClick() {
    if (!("geolocation" in navigator)) {
      setSosStatus("জিপিএস সমর্থন করে না!");
      return;
    }

    setSendingSos(true);
    setSosStatus("আপনার অবস্থান খোঁজা হচ্ছে...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const sosPayload = {
          userId: currentUser?.uid || "guest",
          userName: profile?.name || "Anonymous Guest",
          lat: latitude,
          lng: longitude
        };

        try {
          await addDoc(collection(db, "sos"), {
            ...sosPayload,
            createdAt: serverTimestamp()
          });
          setSosStatus("SOS সফলভাবে পাঠানো হয়েছে! সাহায্য আসছে।");
        } catch (err) {
          console.warn("Firestore SOS write failed, saving locally:", err.message);
          let list = JSON.parse(localStorage.getItem("mock_sos_signals") || "[]");
          list.push({ ...sosPayload, createdAt: new Date().toISOString() });
          localStorage.setItem("mock_sos_signals", JSON.stringify(list));
          setSosStatus("SOS সফলভাবে পাঠানো হয়েছে! (লোকাল ডেমো মোড)");
        }

        setTimeout(() => {
          setSosStatus("");
          setSendingSos(false);
        }, 4000);
      },
      (error) => {
        console.error("GPS error:", error);
        setSosStatus("অবস্থান পাওয়া যায়নি। জিপিএস চালু করুন।");
        setSendingSos(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="scroll-area">
      {/* Header (Home green style) */}
      <div className="hdr green">
        <div className="hdr-greeting">আস্সালামু আলাইকুম 👋</div>
        <div className="hdr-name">{profile?.name || "অতিথি ব্যবহারকারী"}</div>
        <div className="hdr-tagline">আপনার স্বাস্থ্য সহায়ক · Shurokkha AI</div>
      </div>

      {/* Alert Banner */}
      <Link to="/alerts" className="alert-bar">
        <div className="alert-bar-icon">⚠️</div>
        <div>
          <div className="alert-bar-title">বন্যার সতর্কতা — সিলেট</div>
          <div className="alert-bar-sub">আজকের লাইভ আপডেট ও আশ্রয়কেন্দ্র দেখুন</div>
        </div>
        <div className="alert-bar-arrow">›</div>
      </Link>

      {/* SOS Button Area */}
      <div className="sos-wrap">
        <div className="sos-hint">জরুরি সাহায্যের জন্য</div>
        <button 
          className="sos-btn" 
          onClick={handleSosClick} 
          disabled={sendingSos}
          style={{ border: sendingSos ? "4px solid var(--amber)" : "" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8v4M12 16h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>SOS</span>
        </button>
        <div className="sos-press">ক্লিক করুন</div>
        {sosStatus && (
          <div className="bengali" style={{
            fontSize: "10px", 
            marginTop: "8px", 
            color: sosStatus.includes("সফল") ? "var(--green)" : "var(--red-dark)",
            fontWeight: "600",
            padding: "0 20px"
          }}>
            {sosStatus}
          </div>
        )}
      </div>

      {/* 2x2 Grid of Actions */}
      <div className="mini-grid">
        <Link to="/chat" className="mini-card">
          <div className="mini-icon">🩺</div>
          <div className="mini-label">AI ডাক্তার</div>
          <div className="mini-sub">লক্ষণ পরীক্ষা করুন</div>
        </Link>
        <Link to="/emergency" className="mini-card">
          <div className="mini-icon">🗺️</div>
          <div className="mini-label">হাসপাতাল খুঁজুন</div>
          <div className="mini-sub">কাছের জরুরি সেবা</div>
        </Link>
        <Link to="/profile" className="mini-card">
          <div className="mini-icon">🔔</div>
          <div className="mini-label">ওষুধ রিমাইন্ডার</div>
          <div className="mini-sub">রিমাইন্ডার ট্র্যাক করুন</div>
        </Link>
        <Link to="/alerts" className="mini-card">
          <div className="mini-icon">🌩️</div>
          <div className="mini-label">দুর্যোগ সতর্কতা</div>
          <div className="mini-sub">লাইভ আপডেট</div>
        </Link>
      </div>
    </div>
  );
}