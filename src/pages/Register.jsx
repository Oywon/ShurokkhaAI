import React, { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { saveUserProfile, errorMessage } from "../firebase/dbService";
import { auth } from "../firebase/config";

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

export default function Register() {
  const [authMethod, setAuthMethod] = useState("phone");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [location, setLocation] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
  const { signup, updateAuthProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    return () => {
      if (window.registerRecaptcha) {
        window.registerRecaptcha.clear();
      }
    };
  }, []);

  function setupRecaptcha() {
    if (window.registerRecaptcha) {
      window.registerRecaptcha.clear();
    }
    window.registerRecaptcha = new RecaptchaVerifier(
      "register-recaptcha-container",
      { size: "invisible", callback: () => {} },
      auth
    );
  }

  function switchRegisterMethod(method) {
    setAuthMethod(method);
    setStep(1);
    setError("");
    setSuccess("");
    setConfirmationResult(null);
    setOtp("");
  }

  async function handleNextStep(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!name || !email || !password || !confirmPassword || !location) {
      setError("সব ক্ষেত্র পূরণ করুন।");
      return;
    }
    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড মিলছে না।");
      return;
    }
    if (!consent) {
      setError("গোপনীয়তা নীতি ও শর্তাবলী মেনে নিন।");
      return;
    }

    if (authMethod === "phone") {
      if (!normalizedPhone || !/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
        setError("সঠিক ফোন নম্বর দিন (যেমন +8801xxxxxxxxx)।");
        return;
      }
      try {
        setLoading(true);
        setupRecaptcha();
        const appVerifier = window.registerRecaptcha;
        const confirmation = await signInWithPhoneNumber(auth, normalizedPhone, appVerifier);
        setConfirmationResult(confirmation);
        setStep(2);
        setSuccess("ওটিপি পাঠানো হয়েছে।");
      } catch (err) {
        setError(errorMessage(err, "ওটিপি পাঠানো যায় নি।"));
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!confirmationResult || !otp) {
      setError("ওটিপি দিন এবং আবার চেষ্টা করুন।");
      return;
    }
    try {
      setLoading(true);
      await confirmationResult.confirm(otp);
      const profile = {
        name,
        email,
        phone,
        bloodGroup,
        location,
        consent,
        createdAt: new Date().toISOString(),
      };
      const user = auth.currentUser;
      if (user) {
        await saveUserProfile(user.uid, profile);
        await updateAuthProfile({ displayName: name });
      }
      toast.success("নিবন্ধন সফল হয়েছে। স্বাগতম!");
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, err.message || "নিবন্ধন ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name || !email || !password || !confirmPassword || !location) {
      setError("সব ক্ষেত্র পূরণ করুন।");
      return;
    }
    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড মিলছে না।");
      return;
    }
    if (!consent) {
      setError("গোপনীয়তা নীতি ও শর্তাবলী মেনে নিন।");
      return;
    }
    try {
      setLoading(true);
      const res = await signup(email, password);
      const uid = res?.user?.uid;
      if (auth.currentUser) {
        await updateAuthProfile({ displayName: name });
      }
      const profile = {
        name,
        email,
        phone,
        bloodGroup,
        location,
        consent,
        createdAt: new Date().toISOString(),
      };
      if (uid) {
        await saveUserProfile(uid, profile);
      }
      toast.success("নিবন্ধন সফল হয়েছে। স্বাগতম!");
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, err.message || "নিবন্ধন ব্যর্থ হয়েছে।"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="login-brand">
            <div className="login-logo">
              <img
                src="/surokkha_ai_logo.PNG"
                alt="Shurokkha AI"
                style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "contain" }}
              />
            </div>
            <div className="login-name">সুরক্ষা AI</div>
            <div className="login-sub">নিবন্ধনের মাধ্যমে শুরু করুন</div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-tabs">
          <button
            className={authMethod === "phone" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchRegisterMethod("phone")}
          >
            ফোন নিবন্ধন
          </button>
          <button
            className={authMethod === "email" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchRegisterMethod("email")}
          >
            ইমেইল নিবন্ধন
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <div id="register-recaptcha-container"></div>

        {authMethod === "phone" ? (
          <>
            {step === 1 ? (
              <form onSubmit={handleNextStep} className="auth-form">
                <div className="form-group">
                  <label className="flabel">👤 পূর্ণ নাম</label>
                  <input
                    type="text"
                    className="finput"
                    placeholder="আপনার নাম"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
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
                <div className="frow-2">
                  <div className="form-group">
                    <label className="flabel">🔐 পাসওয়ার্ড</label>
                    <input
                      type="password"
                      className="finput"
                      placeholder="পাসওয়ার্ড"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="flabel">🔐 পাসওয়ার্ড নিশ্চিত করুন</label>
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
                  <input
                    type="text"
                    className="finput"
                    placeholder="ঢাকা — মিরপুর"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
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
                  {loading ? "ওটিপি পাঠানো হচ্ছে..." : "ওটিপি পাঠান"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
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
                  {loading ? "নিবন্ধন করছে..." : "নিবন্ধন সম্পন্ন করুন"}
                </button>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={handleEmailRegister} className="auth-form">
            <div className="form-group">
              <label className="flabel">👤 পূর্ণ নাম</label>
              <input
                type="text"
                className="finput"
                placeholder="আপনার নাম"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <label className="flabel">📱 ফোন নম্বর</label>
              <div className="finput-wrap">
                <div className="fi-left">+88</div>
                <input
                  type="tel"
                  className="finput"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="frow-2">
              <div className="form-group">
                <label className="flabel">🔐 পাসওয়ার্ড</label>
                <input
                  type="password"
                  className="finput"
                  placeholder="পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="flabel">🔐 পাসওয়ার্ড নিশ্চিত করুন</label>
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
              <input
                type="text"
                className="finput"
                placeholder="ঢাকা — মিরপুর"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
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
        )}
        </div>

        <div className="auth-actions">
          <div className="link-row">
            অ্যাকাউন্ট আছে? <Link to="/login" className="link-text">লগইন করুন</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
