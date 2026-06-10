import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, logSOS } from "../firebase/dbService";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import Skeleton from "../components/Skeleton";

export default function Home() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sosStatus, setSosStatus] = useState("");
  const [sendingSos, setSendingSos] = useState(false);
  const install = useInstallPrompt();

  useEffect(() => {
    async function fetchProfile() {
      if (!currentUser) return;
      let userProfile = await getUserProfile(currentUser.uid);
      if (!userProfile) {
        userProfile = { name: currentUser.email?.split("@")[0] || "অতিথি" };
      }
      setProfile(userProfile);
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
        const result = await logSOS(
          currentUser?.uid || "guest",
          { lat: latitude, lng: longitude },
          { userName: profile?.name || "Anonymous Guest" }
        );

        if (result?.ok) {
          setSosStatus(
            result.source === "firestore"
              ? "SOS সফলভাবে পাঠানো হয়েছে! সাহায্য আসছে।"
              : "SOS সফলভাবে পাঠানো হয়েছে! (লোকাল ডেমো মোড)"
          );
        } else {
          setSosStatus("SOS পাঠানো যায়নি। আবার চেষ্টা করুন।");
        }

        setTimeout(() => {
          setSosStatus("");
          setSendingSos(false);
        }, 4000);
      },
      (error) => {
        console.error("GPS error:", error);
        setSosStatus("অবস্থান পাওয়া যায়নি। জিপিএস চালু করুন।");
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
        {profile === null && currentUser ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            <Skeleton width="55%" height={20} style={{ background: "rgba(255,255,255,0.35)" }} />
            <Skeleton width="40%" height={10} style={{ background: "rgba(255,255,255,0.25)" }} />
          </div>
        ) : (
          <>
            <div className="hdr-name">{profile?.name || "অতিথি ব্যবহারকারী"}</div>
            <div className="hdr-tagline">আপনার স্বাস্থ্য সহায়ক · Shurokkha AI</div>
          </>
        )}
      </div>

      {/* PWA Install Banner (dismissable, 7-day cooldown) */}
      {install.visible && (
        <div
          role="region"
          aria-label="অ্যাপ ইনস্টল ব্যানার"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "10px 14px 0",
            padding: "10px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12
          }}
        >
          <div style={{ fontSize: 22 }}>📲</div>
          <div style={{ flex: 1, lineHeight: 1.3 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>অ্যাপ হিসেবে যোগ করুন</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>দ্রুত লোড · অফলাইনেও কাজ করে</div>
          </div>
          <button
            onClick={() => install.dismiss()}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 11,
              cursor: "pointer"
            }}
          >
            পরে
          </button>
          <button
            onClick={async () => {
              const ok = await install.promptInstall();
              if (!ok) install.dismiss();
            }}
            style={{
              background: "var(--green)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            যোগ করুন
          </button>
        </div>
      )}

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