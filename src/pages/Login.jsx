import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { errorMessage } from "../firebase/dbService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot-password inline form
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetInfo, setResetInfo] = useState({ kind: "", text: "", code: "" });
  const [resetLoading, setResetLoading] = useState(false);
  // Step 2 of forgot-password: enter the code from the email + a new password.
  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const { login, resetPassword, confirmResetCode } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      return setError("দয়া করে ইমেইল ও পাসওয়ার্ড দিন।");
    }
    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড ভুল হতে পারে।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!resetEmail) {
      setResetInfo({ kind: "err", text: "রিসেট লিঙ্ক পাঠাতে ইমেইল দিন।" });
      return;
    }
    setResetLoading(true);
    setResetInfo({ kind: "", text: "", code: "" });
    const res = await resetPassword(resetEmail);
    setResetLoading(false);
    if (res.ok) {
      setResetInfo({ kind: "ok", text: res.message, code: res.code || "" });
      // If we got a simulated code back (offline mode), move to step 2 so
      // the user can enter it along with a new password.
      if (res.simulated && res.code) {
        setResetStep(2);
        setResetCode(res.code);
      }
    } else {
      setResetInfo({ kind: "err", text: res.message, code: "" });
    }
  }

  async function handleConfirmReset(e) {
    e.preventDefault();
    if (!resetCode || !newPassword || !confirmNewPassword) {
      setResetInfo({ kind: "err", text: "কোড ও নতুন পাসওয়ার্ড দিন।", code: "" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetInfo({ kind: "err", text: "নতুন পাসওয়ার্ড দুটি মিলছে না।", code: "" });
      return;
    }
    if (newPassword.length < 6) {
      setResetInfo({ kind: "err", text: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", code: "" });
      return;
    }
    setResetLoading(true);
    const res = await confirmResetCode(resetEmail, resetCode, newPassword);
    setResetLoading(false);
    if (res.ok) {
      setResetInfo({ kind: "ok", text: res.message, code: "" });
      setResetStep(1);
      setShowReset(false);
      setPassword(newPassword); // pre-fill so the user can log in straight away
      setNewPassword("");
      setConfirmNewPassword("");
      setResetCode("");
    } else {
      setResetInfo({ kind: "err", text: res.message, code: "" });
    }
  }

  return (
    <div className="scroll-area" style={{ background: "var(--bg)" }}>
      {/* Brand Header */}
      <div className="login-brand">
        <div className="login-logo">💚</div>
        <div className="login-name">শুরক্ষা AI</div>
        <div className="login-sub">আপনার স্বাস্থ্য সহায়ক</div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="form-body">
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

        <div className="form-group">
          <label className="flabel">📱 ইমেইল ঠিকানা / মোবাইল</label>
          <div className="finput-wrap">
            <div className="fi-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="1.8"/>
                <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              type="email"
              className="finput"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="flabel">🔒 পাসওয়ার্ড</label>
          <div className="finput-wrap">
            <div className="fi-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.8"/>
                <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="1.8"/>
              </svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              className="finput"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="fi-right" onClick={() => setShowPassword(!showPassword)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3" strokeWidth="1.8"/>
              </svg>
            </div>
          </div>
        </div>

        <div
          className="forgot"
          onClick={() => {
            setShowReset((v) => {
              const next = !v;
              if (!next) {
                // closing — clear all reset state
                setResetStep(1);
                setResetCode("");
                setNewPassword("");
                setConfirmNewPassword("");
                setResetInfo({ kind: "", text: "", code: "" });
              }
              return next;
            });
            setResetEmail(resetEmail || email);
            setResetInfo({ kind: "", text: "", code: "" });
          }}
          role="button"
          tabIndex={0}
        >
          পাসওয়ার্ড ভুলে গেছেন?
        </div>

        {showReset && (
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xs)",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {resetStep === 1 && (
              <>
                <div style={{ fontSize: "11px", color: "var(--txt2)", fontWeight: 600 }}>
                  📧 পাসওয়ার্ড রিসেট লিঙ্ক পাঠান
                </div>
                <input
                  type="email"
                  className="finput"
                  placeholder="আপনার ইমেইল"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{ width: "100%" }}
                />
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetLoading}
                  className="auth-btn-primary"
                  style={{ padding: "6px 10px", fontSize: "11px" }}
                >
                  {resetLoading ? "পাঠানো হচ্ছে..." : "রিসেট লিঙ্ক পাঠান"}
                </button>
              </>
            )}

            {resetStep === 2 && (
              <>
                <div style={{ fontSize: "11px", color: "var(--txt2)", fontWeight: 600 }}>
                  🔐 ইমেইলে পাঠানো কোড ও নতুন পাসওয়ার্ড দিন
                </div>
                <input
                  type="text"
                  className="finput"
                  placeholder="৬ সংখ্যার কোড"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  style={{ width: "100%" }}
                />
                <input
                  type="password"
                  className="finput"
                  placeholder="নতুন পাসওয়ার্ড (৬+ অক্ষর)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: "100%" }}
                />
                <input
                  type="password"
                  className="finput"
                  placeholder="পাসওয়ার্ড আবার দিন"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(1);
                      setResetInfo({ kind: "", text: "", code: "" });
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: "11px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--txt2)",
                      borderRadius: "var(--r-xs)",
                      cursor: "pointer",
                    }}
                  >
                    ← পেছনে
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    disabled={resetLoading}
                    className="auth-btn-primary"
                    style={{ padding: "6px 10px", fontSize: "11px", flex: 1 }}
                  >
                    {resetLoading ? "সেট হচ্ছে..." : "নতুন পাসওয়ার্ড সেট করুন"}
                  </button>
                </div>
              </>
            )}

            {resetInfo.text && (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: resetInfo.kind === "ok" ? "var(--green)" : "var(--red-dark)",
                  background: resetInfo.kind === "ok" ? "var(--green-light, #e6f4ea)" : "var(--red-light)",
                  border: `1px solid ${resetInfo.kind === "ok" ? "var(--green)" : "var(--red-border)"}`,
                  borderRadius: "var(--r-xs)",
                  padding: "6px 8px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {resetInfo.text}
              </div>
            )}
          </div>
        )}

        <button type="submit" className="auth-btn-primary" disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {loading ? "লগইন করা হচ্ছে..." : "লগইন করুন"}
        </button>

        <div className="divider-row">
          <div className="div-line"></div>
          <span>বা</span>
          <div className="div-line"></div>
        </div>

        <div className="social-row">
          <div className="social-btn">🔵 Google</div>
          <div className="social-btn">📘 Facebook</div>
        </div>

        <div className="link-row">
          নতুন? <Link to="/register" className="link-text">নিবন্ধন করুন</Link>
        </div>

        <div className="trust-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.8"/>
            <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          আপনার তথ্য সম্পূর্ণ নিরাপদ ও এনক্রিপ্টেড
        </div>
      </form>
    </div>
  );
}
