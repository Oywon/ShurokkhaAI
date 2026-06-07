import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { saveUserProfile, errorMessage } from "../firebase/dbService";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [location, setLocation] = useState("ঢাকা — মিরপুর");
  const [consent, setConsent] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, updateAuthProfile } = useAuth();
  const navigate = useNavigate();

  const bloodGroups = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

  async function handleNextStep(e) {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      return setError("সবগুলো তথ্য পূরণ করুন।");
    }
    if (password !== confirmPassword) {
      return setError("পাসওয়ার্ড দুটি মিলছে না।");
    }
    if (password.length < 6) {
      return setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
    }
    setError("");
    setStep(2);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !age || !phone || !location) {
      return setError("সবগুলো প্রোফাইল তথ্য পূরণ করুন।");
    }
    if (!consent) {
      return setError("আপনাকে গোপনীয়তা নীতিতে সম্মতি জানাতে হবে।");
    }

    try {
      setError("");
      setLoading(true);
      
      // 1. Create Firebase Auth user
      const userCredential = await signup(email, password);
      const user = userCredential.user;

      const profileData = {
        name,
        age: parseInt(age, 10),
        phone,
        bloodGroup,
        location
      };

      // 2. Update Firebase Auth display name (best-effort)
      try {
        await updateAuthProfile({ displayName: name });
      } catch (e) { /* mock-auth or no current user — non-fatal */ }

      // 3. Save profile via dbService (Firestore + localStorage fallback)
      await saveUserProfile(user.uid, profileData);

      // Redirect to Profile
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "নিবন্ধন ব্যর্থ হয়েছে। ইমেইলটি ইতিমধ্যে ব্যবহার করা হতে পারে।"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scroll-area" style={{ background: "var(--bg)" }}>
      {/* Brand Header */}
      <div className="reg-brand">
        <div className="reg-brand-title">নতুন অ্যাকাউন্ট তৈরি করুন</div>
        <div className="reg-brand-sub">মাত্র কয়েকটি তথ্য দিন</div>
      </div>

      {/* Stepper Dots Indicator */}
      <div className="step-dots">
        <div className={`sdot ${step === 1 ? "active" : "done"}`}></div>
        <div className={`sdot ${step === 2 ? "active" : "idle"}`}></div>
      </div>

      <div className="form-body" style={{ paddingTop: "12px" }}>
        {error && (
          <div style={{
            color: "var(--red-dark)", 
            background: "var(--red-light)", 
            border: "1px solid var(--red-border)", 
            padding: "8px 10px", 
            borderRadius: "var(--r-xs)", 
            fontSize: "11px",
            fontWeight: "600",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="form-group">
              <label className="flabel">📧 ইমেইল ঠিকানা</label>
              <div className="finput-wrap">
                <div className="fi-left">✉️</div>
                <input 
                  type="email" 
                  className="finput" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="flabel">🔒 পাসওয়ার্ড</label>
              <div className="finput-wrap">
                <div className="fi-left">🔒</div>
                <input 
                  type="password" 
                  className="finput" 
                  placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="flabel">🔒 পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="finput-wrap">
                <div className="fi-left">✓</div>
                <input 
                  type="password" 
                  className="finput" 
                  placeholder="পুনরায় পাসওয়ার্ডটি লিখুন" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary">
              পরবর্তী ধাপ →
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="frow-2">
              <div className="form-group">
                <label className="flabel">পুরো নাম</label>
                <div className="finput-wrap">
                  <div className="fi-left">👤</div>
                  <input 
                    type="text" 
                    className="finput no-icon" 
                    placeholder="আপনার নাম" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="flabel">বয়স</label>
                <div className="finput-wrap">
                  <div className="fi-left">🎂</div>
                  <input 
                    type="number" 
                    className="finput no-icon" 
                    placeholder="বছর" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="flabel">মোবাইল নম্বর</label>
              <div className="finput-wrap">
                <div className="fi-left">📞</div>
                <input 
                  type="text" 
                  className="finput" 
                  placeholder="+880 1X XXX XXXXX" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="flabel">রক্তের গ্রুপ</label>
              <div className="bg-chips-wrap">
                {bloodGroups.map((bg) => (
                  <div 
                    key={bg} 
                    className={`bg-chip ${bloodGroup === bg ? "sel" : ""}`}
                    onClick={() => setBloodGroup(bg)}
                  >
                    {bg}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="flabel">বিভাগ / জেলা</label>
              <div className="finput-wrap">
                <div className="fi-left">📍</div>
                <input 
                  type="text" 
                  className="finput" 
                  placeholder="ঢাকা — মিরপুর" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="consent-box" onClick={() => setConsent(!consent)}>
              <div className={consent ? "checkbox-done" : "checkbox-empty"}>
                {consent ? "✓" : ""}
              </div>
              <div className="consent-text">
                আমি <span className="consent-link">গোপনীয়তা নীতি</span> ও <span className="consent-link">শর্তাবলী</span> পড়েছি এবং সম্মতি দিচ্ছি
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button 
                type="button" 
                className="auth-btn-primary" 
                style={{ background: "#eee", color: "#111" }}
                onClick={() => setStep(1)}
              >
                ← পেছনে
              </button>
              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "নিবন্ধন করা হচ্ছে..." : "নিবন্ধন সম্পন্ন করুন"}
              </button>
            </div>
          </form>
        )}

        <div className="link-row">
          অ্যাকাউন্ট আছে? <Link to="/login" className="link-text">লগইন করুন</Link>
        </div>
      </div>
    </div>
  );
}
