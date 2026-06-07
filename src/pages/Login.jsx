import React, { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase/config";

function normalizePhone(phone) {
  let value = phone.trim().replace(/\s+/g, "");
  if (!value) return "";
  if (value.startsWith("+")) return value;
  if (value.startsWith("0")) return "+880" + value.slice(1);
  if (value.startsWith("880")) return "+" + value;
  return "+880" + value;
}

export default function Login() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [authMethod, setAuthMethod] = useState("phone");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  function switchAuthMethod(method) {
    if (method === authMethod) return;
    setAuthMethod(method);
    setError("");
    setSuccess("");
    setOtp("");
    setConfirmationResult(null);
    setStep(1);
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone || !/^\+\d{10,15}$/.test(formattedPhone)) {
      return setError("দয়া করে বৈধ মোবাইল নম্বর দিন। +8801XXXXXXXXX ফরম্যাট ব্যবহার করুন।");
    }

    try {
      setLoading(true);
      console.log("Attempting to send OTP to:", formattedPhone);
      const verifier = setupRecaptcha();
      if (!verifier) {
        throw new Error("reCAPTCHA verification setup failed");
      }
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      console.log("OTP sent successfully");
      setConfirmationResult(result);
      setStep(2);
      setSuccess("OTP পাঠানো হয়েছে। অনুগ্রহ করে কোডটি লিখুন।");
    } catch (err) {
      console.error("Full error details:", err);
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

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!confirmationResult) {
      return setError("প্রথমে OTP পান এবং তারপর যাচাই করুন।");
    }
    if (!otp) {
      return setError("অনুগ্রহ করে OTP কোডটি লিখুন।");
    }

    try {
      setLoading(true);
      await confirmationResult.confirm(otp);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("OTP যাচাই ব্যর্থ হয়েছে। সঠিক কোড লিখুন।");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      return setError("ইমেইল এবং পাসওয়ার্ড উভয়ই প্রয়োজন।");
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      let message = "লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড পরীক্ষা করুন।";
      if (err.code === "auth/user-not-found") {
        message = "এই ইমেইল ঠিকানায় কোনো অ্যাকাউন্ট নেই।";
      } else if (err.code === "auth/wrong-password") {
        message = "ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।";
      } else if (err.code === "auth/invalid-email") {
        message = "সঠিক ইমেইল ঠিকানা লিখুন।";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("Google সাইন-ইন ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scroll-area" style={{ background: "var(--bg)" }}>
      <div className="login-brand">
        <div className="login-logo">💚</div>
        <div className="login-name">শুরক্ষা AI</div>
        <div className="login-sub">
          নিরাপদভাবে আপনার অ্যাকাউন্টে প্রবেশ করুন — ফোন বা ইমেইল দিয়ে।
        </div>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab ${authMethod === "phone" ? "active" : ""}`}
          onClick={() => switchAuthMethod("phone")}
        >
          ফোন লগইন
        </button>
        <button
          type="button"
          className={`auth-tab ${authMethod === "email" ? "active" : ""}`}
          onClick={() => switchAuthMethod("email")}
        >
          ইমেইল লগইন
        </button>
      </div>

      <div className="form-body">
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
            ? "ধাপে ধাপে ফোন নম্বর দিন, OTP নিন, তারপর চালিয়ে যান।"
            : "ইমেইল এবং পাসওয়ার্ড দিয়ে দ্রুত লগইন করুন কিংবা Google দিয়ে এক ক্লিকে প্রবেশ করুন।"}
        </div>

        {authMethod === "phone" ? (
          <>
            <form onSubmit={step === 1 ? handleSendOtp : handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="flabel">📱 মোবাইল নম্বর</label>
                <div className="finput-wrap">
                  <div className="fi-left">📞</div>
                  <input
                    type="tel"
                    className="finput"
                    placeholder="+8801XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={step === 2}
                  />
                </div>
              </div>

              {step === 2 && (
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
              )}

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading
                  ? step === 1
                    ? "OTP পাঠানো হচ্ছে..."
                    : "OTP যাচাই করা হচ্ছে..."
                  : step === 1
                  ? "OTP পাঠান"
                  : "লগইন করুন"}
              </button>
            </form>

            <div id="recaptcha-container" style={{ marginTop: "16px" }}></div>

            {step === 2 && (
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
            )}
          </>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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

              <div className="form-group">
                <label className="flabel">🔐 পাসওয়ার্ড</label>
                <div className="finput-wrap">
                  <div className="fi-left">🔒</div>
                  <input
                    type="password"
                    className="finput"
                    placeholder="গোপন পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "লগইন করা হচ্ছে..." : "ইমেইল দিয়ে লগইন করুন"}
              </button>
            </form>

            <button
              type="button"
              className="auth-btn-primary"
              style={{ marginTop: "10px", background: "#4285F4", color: "white" }}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? "প্রসেস করা হচ্ছে..." : "Google দিয়ে চালিয়ে যান"}
            </button>
          </>
        )}

        <div className="link-row">
          নতুন? <Link to="/register" className="link-text">নিবন্ধন করুন</Link>
        </div>
      </div>
    </div>
  );
}
