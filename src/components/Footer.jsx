import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#0F4A32] text-white/80 px-4 py-6">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="bengali text-base font-bold text-white">সুরক্ষা AI</div>
            <div className="text-xs opacity-70">AI for Humanity, Safety & Accessibility</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link to="/" className="bengali text-sm text-white/75 transition hover:text-white">হোম</Link>
          <Link to="/dashboard" className="bengali text-sm text-white/75 transition hover:text-white">ড্যাশবোর্ড</Link>
          <Link to="/emergency" className="bengali text-sm text-white/75 transition hover:text-white">জরুরি সেবা</Link>
        </div>

        <div className="text-xs text-white/60">© 2026 Shurokkha AI · Bangladesh</div>
      </div>
    </footer>
  );
}

