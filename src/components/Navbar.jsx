import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  { path: "/", label: "হোম", labelEn: "Home" },
  { path: "/dashboard", label: "ড্যাশবোর্ড", labelEn: "Dashboard" },
  { path: "/emergency", label: "জরুরি সেবা", labelEn: "Emergency" },
  { path: "/symptoms", label: "উপসর্গ পরীক্ষা", labelEn: "Symptoms" },
];

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      console.error('Sign out error', e);
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#1B6B4A] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 text-white">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="bengali text-base font-bold leading-tight">সুরক্ষা AI</div>
            <div className="text-[11px] opacity-75">Shurokkha AI</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="bengali">{link.label}</span>
              </Link>
            );
          })}
          <Link
            to="/emergency"
            className="rounded-xl bg-[#D93025] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF4436]"
          >
            🆘 SOS
          </Link>
          {/* Auth control */}
          {currentUser ? (
            <button onClick={handleSignOut} className="ml-3 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20">Sign out</button>
          ) : (
            <Link to="/auth" className="ml-3 rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10">Sign in</Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-xl text-white transition hover:bg-white/10 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="space-y-1 border-t border-white/10 bg-[#0F4A32] px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              onClick={() => setMenuOpen(false)}
            >
              <span className="bengali">{link.label}</span>
            </Link>
          ))}
          <Link
            to="/emergency"
            className="block rounded-xl bg-[#D93025] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#FF4436]"
            onClick={() => setMenuOpen(false)}
          >
            🆘 SOS
          </Link>
          {currentUser ? (
            <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="w-full text-left block rounded-xl px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10">Sign out</button>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10">Sign in</Link>
          )}
        </div>
      )}
    </nav>
  );
}

