import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      return setError("দয়া করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন।");
    }

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড ভুল হতে পারে।");
    } finally {
      setLoading(false);
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

        <div className="forgot">পাসওয়ার্ড ভুলে গেছেন?</div>

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
