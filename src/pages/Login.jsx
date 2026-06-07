import React, { useEffect, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase/config";
import { errorMessage } from "../firebase/dbService";

function normalizePhoneNumber(phone) {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("01")) {
    return "+88" + digits;
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    return "+88" + digits;
  }
  return phone;
}

export default function Login() {
  const [authMethod, setAuthMethod] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, resetPassword, confirmResetCode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  function setupRecaptcha() {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    window.recaptchaVerifier = new RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "invisible",
        callback: () => {},
      },
      auth
    );
  }

  function switchAuthMethod(method) {
    setAuthMethod(method);
    setError("");
    setSuccess("");
    setStep(1);
    setConfirmationResult(null);
    setOtp("");
    setShowReset(false);
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone || !/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
      setError("সঠিক ফোন নম্বর লিখুন (যেমন +8801xxxxxxxxx)।");
      return;
    }

    try {
      setLoading(true);
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
      setSuccess("ওটিপি পাঠানো হয়েছে, দয়া করে সেটি লিখুন।");
    } catch (err) {
      setError(errorMessage(err, "ওটিপি পাঠানো যায় নি। পরে চেষ্টা করুন।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    if (!confirmationResult) {
      setError("অনুগ্রহ করে প্রথমে ওটিপি পাঠান।");
      return;
    }
    if (!otp) {
      setError("ওটিপি লিখুন।");
      return;
    }
    try {
      setLoading(true);
      await confirmationResult.confirm(otp);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, "ওটিপি যাচাই ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email || !password) {
      setError("ইমেইল ও পাসওয়ার্ড দিন।");
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, err.message || "লগইন ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, "গুগল লগইন ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!resetEmail) {
      setError("রিসেটের জন্য ইমেইল দিন।");
      return;
    }
    try {
      setLoading(true);
      const res = await resetPassword(resetEmail);
      if (res.ok) {
        setSuccess(res.message || "রিসেট ইমেইল পাঠানো হয়েছে।");
        if (res.simulated) {
          setResetStep(2);
          setSuccess(res.message);
        }
      } else {
        setError(res.message || "রিসেট ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setError(errorMessage(err, err.message || "রিসেট ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!resetCode || !newPassword || !confirmNewPassword) {
      setError("সব ক্ষেত্র পূরণ করুন।");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("নতুন পাসওয়ার্ড মিলছে না।");
      return;
    }
    try {
      setLoading(true);
      const res = await confirmResetCode(resetEmail, resetCode, newPassword);
      if (res.ok) {
        setSuccess(res.message || "পাসওয়ার্ড সফলভাবে রিসেট হয়েছে।");
        setShowReset(false);
        setResetStep(1);
      } else {
        setError(res.message || "রিসেট ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setError(errorMessage(err, err.message || "রিসেট ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="login-brand">
          <div className="login-logo">💚</div>
          <div className="login-name">শুরক্ষা AI</div>
          <div className="login-sub">আপনার স্মার্ট স্বাস্থ্য সহকারী</div>
        </div>

        <div className="auth-tabs">
          <button
            className={authMethod === "phone" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchAuthMethod("phone")}
          >
            ফোন ওটিপি
          </button>
          <button
            className={authMethod === "email" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchAuthMethod("email")}
          >
            ইমেইল
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <div id="recaptcha-container"></div>

        {authMethod === "phone" ? (
          <>
            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="auth-form">
                <div className="form-group">
                  <label className="flabel">📱 ফোন নম্বর</label>
                  <div className="finput-wrap">
                    <div className="fi-left">+88</div>
                    <input
                      type="tel"
                      className="finput"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? "ওটিপি পাঠানো হচ্ছে..." : "ওটিপি পাঠান"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="form-group">
                  <label className="flabel">🔑 ওটিপি লিখুন</label>
                  <input
                    type="text"
                    className="finput"
                    placeholder="৬ অঙ্কের ওটিপি"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? "যাচাই করা হচ্ছে..." : "লগইন করুন"}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            {!showReset ? (
              <form onSubmit={handleEmailLogin} className="auth-form">
                <div className="form-group">
                  <label className="flabel">📧 ইমেইল</label>
                  <input
                    type="email"
                    className="finput"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="flabel">🔐 পাসওয়ার্ড</label>
                  <div className="finput-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="finput"
                      placeholder="পাসওয়ার্ড"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div
                      className="fi-right"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </div>
                  </div>
                </div>
                <div className="link-row">
                  <button type="button" className="link-text btn-reset" onClick={() => setShowReset(true)}>
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? "লগইন করা হচ্ছে..." : "ইমেইল দিয়ে লগইন"}
                </button>
              </form>
            ) : (
              <form onSubmit={resetStep === 1 ? handleReset : handleConfirmReset} className="auth-form">
                <div className="form-group">
                  <label className="flabel">📧 রিসেট ইমেইল</label>
                  <input
                    type="email"
                    className="finput"
                    placeholder="you@gmail.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                {resetStep === 2 && (
                  <>
                    <div className="form-group">
                      <label className="flabel">🔑 রিসেট কোড</label>
                      <input
                        type="text"
                        className="finput"
                        placeholder="৬ অঙ্কের কোড"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="flabel">নতুন পাসওয়ার্ড</label>
                      <input
                        type="password"
                        className="finput"
                        placeholder="নতুন পাসওয়ার্ড"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="flabel">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                      <input
                        type="password"
                        className="finput"
                        placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? "প্রক্রিয়া চলছে..." : resetStep === 1 ? "রিসেট লিঙ্ক পাঠান" : "নতুন পাসওয়ার্ড সেভ করুন"}
                </button>
                <div className="link-row">
                  <button type="button" className="link-text btn-reset" onClick={() => {
                    setShowReset(false);
                    setResetStep(1);
                    setError("");
                    setSuccess("");
                  }}>
                    ফিরে যান
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        <div className="auth-divider">অথবা</div>

        <button type="button" className="auth-btn-secondary" onClick={handleGoogleSignIn} disabled={loading}>
          {loading ? "প্রসেস হচ্ছে..." : "গুগল দিয়ে চালু করুন"}
        </button>

        <div className="link-row">
          নতুন? <Link to="/register" className="link-text">নিবন্ধন করুন</Link>
        </div>
      </div>
    </div>
  );
}
