import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import SymptomChecker from "./pages/SymptomChecker";
import Emergency from "./pages/Emergency";
import DisasterAlerts from "./pages/DisasterAlerts";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DataEntry from "./pages/DataEntry";
import Navbar from "./components/Navbar";
import PWAInstallBanner from "./components/PWAInstallBanner";
import NoticeBanner from "./components/NoticeBanner";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

function PhoneLayout() {
  const location = useLocation();
  
  // Hide navbar on login and register screens
  const hideNav = ["/login", "/register"].includes(location.pathname);
  
  return (
    <div className="main-content">
      {/* Pages Container */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<SymptomChecker />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/alerts" element={<DisasterAlerts />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Bottom Navigation */}
      {!hideNav && <Navbar />}

      {/* PWA install prompt — hidden on login/register, slides up from bottom */}
      {!hideNav && <PWAInstallBanner />}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="app-wrapper">
            <NoticeBanner id="phone-otp-billing-v1">
              <strong>ফোন OTP লগইন সাময়িকভাবে বন্ধ আছে।</strong>
              <br />
              Firebase phone authentication এর বিলিং সক্রিয় না থাকায় OTP পাঠানো
              যাচ্ছে না। এই সময়ে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন অথবা
              Google দিয়ে চালু করুন।
              <br />
              <span className="notice-banner__sub">
                Phone OTP sign-in is temporarily unavailable due to Firebase
                billing. Please use email/password or Google sign-in for now.
              </span>
            </NoticeBanner>
            <PhoneLayout />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;