import React, { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

function normalizePhone(phone) {
  let value = phone.trim().replace(/\s+/g, "");
  if (!value) return "";
  if (value.startsWith("+")) return value;
  if (value.startsWith("0")) return "+880" + value.slice(1);
  if (value.startsWith("880")) return "+" + value;
  return "+880" + value;
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [location, setLocation] = useState("ঢাকা — মিরপুর");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMethod, setAuthMethod] = useState("phone");
  const [consent, setConsent] = useState(true);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const bloodGroups = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  function setupRecaptcha() {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        { 
          size: "invisible",
          callback: (response) => {
            console.log("reCAPTCHA verified:", response);
          },
          "error-callback": () => {
            console.error("reCAPTCHA error");
          }
        },
        auth
      );

      return window.recaptchaVerifier;
    } catch (err) {
      console.error("reCAPTCHA setup error:", err);
      return null;
    }
  }

  function switchRegisterMethod(method) {
    if (method === authMethod) return;
    setAuthMethod(method);
    setError("");
    setSuccess("");
    setOtp("");
    setConfirmationResult(null);
    setStep(1);
  }

  async function handleNextStep(e) {
    e.preventDefault();
    if (!name || !age || !phone || !location) {
      return setError("সবগুলো তথ্য পূরণ করুন।");
    }
    if (!consent) {
      return setError("আপনাকে গোপনীয়তা নীতিতে সম্মতি জানাতে হবে।");
    }

    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone || !/^\+\d{10,15}$/.test(formattedPhone)) {
      return setError("দয়া করে বৈধ মোবাইল নম্বর দিন। +8801XXXXXXXXX ফরম্যাট ব্যবহার করুন।");
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);
      console.log("Register: Attempting to send OTP to:", formattedPhone);
      const verifier = setupRecaptcha();
      if (!verifier) {
        throw new Error("reCAPTCHA verification setup failed");
      }
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      console.log("Register: OTP sent successfully");
      setConfirmationResult(result);
      setSuccess("OTP পাঠানো হয়েছে। কোডটি নীচে লিখুন।");
      setStep(2);
    } catch (err) {
      console.error("Register full error details:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      let errorMsg = "OTP পাঠাতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।";
      if (err.code === "auth/invalid-phone-number") {
        errorMsg = "অবৈধ মোবাইল নম্বর। +8801XXXXXXXXX ফরম্যাট ব্যবহার করুন।";
      } else if (err.code === "auth/too-many-requests") {
        errorMsg = "খুব বেশি অনুরোধ। কয়েক মিনিট পরে চেষ্টা করুন।";
      } else if (err.code === "auth/operation-not-supported-in-this-environment") {
        errorMsg = "এই পরিবেশে Firebase ফোন অথেন্টিকেশন সমর্থিত নয়।";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!otp) {
      return setError("অনুগ্রহ করে OTP কোডটি লিখুন।");
    }
    if (!confirmationResult) {
      return setError("প্রথমে OTP পাঠান এবং তারপর যাচাই করুন।");
    }

    try {
      setError("");
      setLoading(true);
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      const profileData = {
        name,
        age: parseInt(age, 10),
        phone: normalizePhone(phone),
        bloodGroup,
        location,
        createdAt: new Date()
      };

      try {
        await setDoc(doc(db, "users", user.uid), profileData);
      } catch (dbErr) {
        console.warn("Firestore write failed, saving profile locally:", dbErr.message);
        localStorage.setItem("mock_user_profile", JSON.stringify(profileData));
      }

      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("OTP যাচাই ব্যর্থ হয়েছে। সঠিক কোড লিখুন।");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password || !confirmPassword || !age || !location) {
      return setError("সব প্রয়োজনীয় তথ্য পূরণ করুন।");
    }
    if (password !== confirmPassword) {
      return setError("পাসওয়ার্ড এবং নিশ্চিত পাসওয়ার্ড মিলছে না।");
    }
    if (password.length < 6) {
      return setError("পাসওয়ার্ড অন্তত ৬ টি অক্ষর হতে হবে।");
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const profileData = {
        name,
        age: parseInt(age, 10),
        phone: phone ? normalizePhone(phone) : null,
        email,
        bloodGroup,
        location,
        createdAt: new Date()
      };

      try {
        await setDoc(doc(db, "users", user.uid), profileData);
      } catch (dbErr) {
        console.warn("Firestore write failed, saving profile locally:", dbErr.message);
        localStorage.setItem("mock_user_profile", JSON.stringify(profileData));
      }

      navigate("/profile");
    } catch (err) {
      console.error(err);
      let message = "রেজিস্ট্রেশন ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।";
      if (err.code === "auth/email-already-in-use") {
        message = "এই ইমেইল ইতোমধ্যে ব্যবহার করা হয়েছে।";
      } else if (err.code === "auth/invalid-email") {
        message = "সঠিক ইমেইল ঠিকানা লিখুন।";
      } else if (err.code === "auth/weak-password") {
        message = "পাসওয়ার্ড খুব দুর্বল; আরও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scroll-area" style={{ background: "var(--bg)" }}>
      <div className="reg-brand">
        <div className="reg-brand-title">নতুন অ্যাকাউন্ট তৈরি করুন</div>
        <div className="reg-brand-sub">পছন্দসই রেজিস্ট্রেশন পদ্ধতি বেছে নিন।</div>
      </div>

      <div className="auth-tabs" style={{ padding: "0 14px" }}>
        <button
          type="button"
          className={`auth-tab ${authMethod === "phone" ? "active" : ""}`}
          onClick={() => switchRegisterMethod("phone")}
        >
          ফোন নিবন্ধন
        </button>
        <button
          type="button"
          className={`auth-tab ${authMethod === "email" ? "active" : ""}`}
          onClick={() => switchRegisterMethod("email")}
        >
          ইমেইল নিবন্ধন
        </button>
      </div>

      {authMethod === "phone" && (
        <div className="step-dots">
          <div className={`sdot ${step === 1 ? "active" : "done"}`}></div>
          <div className={`sdot ${step === 2 ? "active" : "idle"}`}></div>
        </div>
      )}

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

        {success && (
          <div style={{
            color: "var(--green-dark)",
            background: "var(--green-light)",
            border: "1px solid var(--green-border)",
            padding: "8px 10px",
            borderRadius: "var(--r-xs)",
            fontSize: "11px",
            fontWeight: "600",
            textAlign: "center"
          }}>
            {success}
          </div>
        )}

        <div className="auth-card-note">
          {authMethod === "phone"
            ? "ব্যক্তিগত তথ্য দিন, ফোনে OTP নিন এবং প্রোফাইল তৈরি করুন।"
            : "ইমেইল, পাসওয়ার্ড এবং প্রোফাইল তথ্য লিখে সরাসরি নিবন্ধন করুন।"}
        </div>

        {authMethod === "phone" ? (
          <>
            <div style={{
              margin: "10px 0",
              padding: "10px",
              borderRadius: "var(--r-xs)",
              background: "#f6ffef",
              border: "1px solid #d1fae5",
              color: "#14532d",
              fontSize: "12px"
            }}>
              আপনাকে একটি OTP পাঠানো হবে আপনার মোবাইলে। প্রোফাইল তথ্য পূরণ করুন এবং পরবর্তী ধাপে যাচাই করুন।
            </div>

            {step === 1 && (
              <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                      type="tel"
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

                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? "OTP পাঠানো হচ্ছে..." : "পরবর্তী ধাপ →"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="form-group">
                  <label className="flabel">🔐 OTP কোড</label>
                  <div className="finput-wrap">
                    <div className="fi-left">⏳</div>
                    <input
                      type="text"
                      className="finput"
                      placeholder="৬ ডিজিটের কোড"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? "যাচাই করা হচ্ছে..." : "নিবন্ধন সম্পন্ন করুন"}
                </button>

                <button
                  type="button"
                  className="auth-btn-primary"
                  style={{ background: "#f3f4f6", color: "#111" }}
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setError("");
                    setSuccess("");
                    setConfirmationResult(null);
                    if (window.recaptchaVerifier) {
                      window.recaptchaVerifier.clear();
                      window.recaptchaVerifier = null;
                    }
                  }}
                >
                  ← আগে ফিরে যান
                </button>
              </form>
            )}

            <div id="recaptcha-container" style={{ marginTop: "16px" }}></div>
          </>
        ) : (
          <>
            <div style={{
              margin: "10px 0",
              padding: "10px",
              borderRadius: "var(--r-xs)",
              background: "#f6ffef",
              border: "1px solid #d1fae5",
              color: "#14532d",
              fontSize: "12px"
            }}>
              ইমেইল এবং পাসওয়ার্ড ব্যবহার করে দ্রুত নিবন্ধন করুন। ফোন নম্বর ঐচ্ছিক হতে পারে।
            </div>

            <form onSubmit={handleEmailRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                <label className="flabel">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <div className="finput-wrap">
                  <div className="fi-left">📞</div>
                  <input
                    type="tel"
                    className="finput"
                    placeholder="+880 1X XXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="flabel">📧 ইমেইল</label>
                <div className="finput-wrap">
                  <div className="fi-left">✉️</div>
                  <input
                    type="email"
                    className="finput"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="frow-2">
                <div className="form-group">
                  <label className="flabel">🔐 পাসওয়ার্ড</label>
                  <div className="finput-wrap">
                    <div className="fi-left">🔒</div>
                    <input
                      type="password"
                      className="finput"
                      placeholder="পাসওয়ার্ড"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="flabel">🔐 পাসওয়ার্ড নিশ্চিত করুন</label>
                  <div className="finput-wrap">
                    <div className="fi-left">🔒</div>
                    <input
                      type="password"
                      className="finput"
                      placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
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

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "নিবন্ধন করা হচ্ছে..." : "ইমেইল দিয়ে নিবন্ধন করুন"}
              </button>
            </form>
          </>
        )}

        <div className="link-row">
          অ্যাকাউন্ট আছে? <Link to="/login" className="link-text">লগইন করুন</Link>
        </div>
      </div>
    </div>
  );
}
