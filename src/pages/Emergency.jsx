import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { logSOS } from "../firebase/dbService";

export default function Emergency() {
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  async function sendSOS() {
    if (!("geolocation" in navigator)) {
      setMessage("আপনার ব্রাউজার জিপিএস সমর্থন করে না।");
      return;
    }
    setSending(true);
    setMessage("আপনার অবস্থান খোঁজা হচ্ছে...");
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const result = await logSOS(currentUser?.uid, { lat, lng });
          if (result?.ok) {
            const suffix = result.source === "local" ? " (অফলাইনে সংরক্ষিত)" : "";
            setMessage(`SOS সফলভাবে পাঠানো হয়েছে${suffix}। নিকটস্থ সাহায্যকারীকে সতর্ক করা হচ্ছে।`);
          } else {
            setMessage("SOS পাঠাতে ব্যর্থ হয়েছে।");
          }
        } catch (err) {
          console.error(err);
          setMessage("SOS পাঠাতে ব্যর্থ হয়েছে।");
        }
        setSending(false);
      },
      (err) => {
        console.error(err);
        setMessage("অবস্থান পাওয়া যায়নি। জিপিএস চালু আছে কিনা পরীক্ষা করুন।");
        setSending(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Helplines list
  const helplines = [
    { number: "999", label: "জাতীয় জরুরি সেবা (পুলিশ, ফায়ার সার্ভিস, অ্যাম্বুলেন্স)" },
    { number: "16257", label: "স্বাস্থ্য বাতায়ন (২৪ ঘণ্টা চিকিৎসা পরামর্শ)" },
    { number: "1090", label: "দুর্যোগের আগাম বার্তা (বন্যা ও আবহাওয়া তথ্য)" }
  ];

  return (
    <div className="scroll-area">
      {/* Header */}
      <div className="hdr red">
        <div className="hdr-title">🚨 জরুরি সেবা</div>
        <div className="hdr-sub">তাৎক্ষণিক সাহায্য পান</div>
      </div>

      {/* SOS Trigger Card */}
      <div className="emg-sos-card">
        <div className="emg-sos-title">🆘 এক-ক্লিক SOS</div>
        <div className="emg-sos-sub">আপনার পরিবার ও হেল্পলাইনে অবস্থান যাবে</div>
        <button className="emg-sos-cta" onClick={sendSOS} disabled={sending}>
          {sending ? "পাঠানো হচ্ছে..." : "এখনই পাঠান"}
        </button>
        {message && (
          <div style={{ marginTop: 10, fontSize: 10, fontWeight: "600", color: "#fff" }}>
            {message}
          </div>
        )}
      </div>

      {/* Offline Connectivity Badge */}
      <div className="offline-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16.7 16.7A10 10 0 017.3 7.3M3.1 3.1a15.9 15.9 0 0117.8 17.8M9.5 9.5A5 5 0 0114.5 14.5" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        অফলাইনেও কাজ করে — ইন্টারনেট ছাড়া
      </div>

      {/* Emergency Assistance List */}
      <div className="emg-list">
        <button 
          className="emg-item" 
          onClick={() => setActiveModal("hospitals")}
          style={{ width: "100%", border: "1px solid var(--border)", background: "none", textAlign: "left", cursor: "pointer" }}
        >
          <div className="emg-icon hosp">🏥</div>
          <div>
            <div className="emg-label">কাছের হাসপাতাল</div>
            <div className="emg-sub">ঢাকা মেডিকেল কলেজ হাসপাতাল</div>
          </div>
          <div className="emg-dist">১.২ কিমি</div>
        </button>

        <button 
          className="emg-item" 
          onClick={() => setActiveModal("shelters")}
          style={{ width: "100%", border: "1px solid var(--border)", background: "none", textAlign: "left", cursor: "pointer" }}
        >
          <div className="emg-icon shelt">🏠</div>
          <div>
            <div className="emg-label">আশ্রয়কেন্দ্র</div>
            <div className="emg-sub">উত্তরা মডেল স্কুল আশ্রয়কেন্দ্র</div>
          </div>
          <div className="emg-dist">০.৮ কিমি</div>
        </button>

        <button 
          className="emg-item" 
          onClick={() => setActiveModal("firstaid")}
          style={{ width: "100%", border: "1px solid var(--border)", background: "none", textAlign: "left", cursor: "pointer" }}
        >
          <div className="emg-icon first">🩹</div>
          <div>
            <div className="emg-label">প্রথম চিকিৎসা গাইড</div>
            <div className="emg-sub">অফলাইনে কাজের নির্দেশিকা</div>
          </div>
          <div className="emg-arr">›</div>
        </button>

        <button 
          className="emg-item" 
          onClick={() => setActiveModal("helpline")}
          style={{ width: "100%", border: "1px solid var(--border)", background: "none", textAlign: "left", cursor: "pointer" }}
        >
          <div className="emg-icon phone">📞</div>
          <div>
            <div className="emg-label">জরুরি হেল্পলাইন</div>
            <div className="emg-sub">999 · 16257 · 1090</div>
          </div>
          <div className="emg-arr">›</div>
        </button>
      </div>

      {/* Interactive Modals */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {activeModal === "hospitals" && (
              <>
                <div className="modal-title">🏥 নিকটস্থ হাসপাতাল ও ক্লিনিক</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <strong>• ঢাকা মেডিকেল কলেজ হাসপাতাল</strong>
                    <div style={{ color: "var(--txt2)" }}>অবস্থান: বকশিবাজার, ঢাকা (১.২ কিমি)</div>
                    <a href="tel:02-55165088" style={{ color: "var(--blue)", textDecoration: "none", fontSize: "10px" }}>📞 কল করুন: 02-55165088</a>
                  </div>
                  <hr style={{ border: "0.5px solid var(--border)" }} />
                  <div>
                    <strong>• কুর্মিটোলা জেনারেল হাসপাতাল</strong>
                    <div style={{ color: "var(--txt2)" }}>অবস্থান: বিমানবন্দর সড়ক, কুর্মিটোলা (৪.৫ কিমি)</div>
                    <a href="tel:02-55062345" style={{ color: "var(--blue)", textDecoration: "none", fontSize: "10px" }}>📞 কল করুন: 02-55062345</a>
                  </div>
                </div>
              </>
            )}

            {activeModal === "shelters" && (
              <>
                <div className="modal-title">🏠 সচল দুর্যোগ আশ্রয়কেন্দ্র</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <strong>• উত্তরা মডেল স্কুল আশ্রয়কেন্দ্র</strong>
                    <div style={{ color: "var(--txt2)" }}>অবস্থান: সেক্টর ৪, উত্তরা (০.৮ কিমি)</div>
                    <span style={{ color: "var(--green)", fontWeight: "600" }}>● সচল ও ধারণক্ষমতা পর্যাপ্ত</span>
                  </div>
                  <hr style={{ border: "0.5px solid var(--border)" }} />
                  <div>
                    <strong>• মিরপুর সরকারি উচ্চ বিদ্যালয় আশ্রয়কেন্দ্র</strong>
                    <div style={{ color: "var(--txt2)" }}>অবস্থান: মিরপুর ২, ঢাকা (২.১ কিমি)</div>
                    <span style={{ color: "var(--green)", fontWeight: "600" }}>● সচল ও ধারণক্ষমতা পর্যাপ্ত</span>
                  </div>
                </div>
              </>
            )}

            {activeModal === "firstaid" && (
              <>
                <div className="modal-title">🩹 প্রথম চিকিৎসা গাইড (First-Aid)</div>
                <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "250px", overflowY: "auto" }}>
                  <div>
                    <strong>🌡️ উচ্চ জ্বর:</strong>
                    <p style={{ color: "var(--txt2)" }}>মাথায় ভেজা পট্টি দিন। সারা শরীর নরম ভিজা কাপড় দিয়ে মুছে দিন। প্যারাসিটামল খাওয়ান।</p>
                  </div>
                  <div>
                    <strong>🐍 সাপে কাটা:</strong>
                    <p style={{ color: "var(--txt2)" }}>আক্রান্ত অঙ্গটি নাড়াচাড়া করবেন না। কাটার জায়গার কিছুটা উপরে হালকা করে বাঁধুন। ওঝার কাছে না গিয়ে দ্রুত হাসপাতালে নিয়ে যান।</p>
                  </div>
                  <div>
                    <strong>🌊 পানিতে ডোবা:</strong>
                    <p style={{ color: "var(--txt2)" }}>আক্রান্ত ব্যক্তিকে পানি থেকে তুলে সমতল স্থানে শুইয়ে দিন। শ্বাস না চললে মুখে ফু দিয়ে কৃত্রিম শ্বাস-প্রশ্বাস (CPR) দিন।</p>
                  </div>
                  <div>
                    <strong>🥵 হিট স্ট্রোক:</strong>
                    <p style={{ color: "var(--txt2)" }}>তাত্ক্ষণিকভাবে রোগীকে ঠাণ্ডা ও ছায়াযুক্ত স্থানে আনুন। ফ্যানের বাতাস দিন বা ভেজা কাপড় দিয়ে শরীর মুছুন। পর্যাপ্ত খাবার স্যালাইন খাওয়ান।</p>
                  </div>
                </div>
              </>
            )}

            {activeModal === "helpline" && (
              <>
                <div className="modal-title">📞 জরুরি সেবার নম্বরসমূহ</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {helplines.map((h) => (
                    <div key={h.number} style={{ fontSize: "11px" }}>
                      <a 
                        href={`tel:${h.number}`} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          background: "var(--green-light)",
                          border: "1px solid var(--green-mid)",
                          borderRadius: "var(--r-xs)",
                          padding: "6px 10px",
                          color: "var(--green-dark)",
                          textDecoration: "none",
                          fontWeight: "700"
                        }}
                      >
                        <span>কল করুন: {h.number}</span>
                        <span>📞</span>
                      </a>
                      <p style={{ fontSize: "9px", color: "var(--txt2)", marginTop: "4px" }}>{h.label}</p>
                    </div>
                  ))}
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