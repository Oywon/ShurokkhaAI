import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const navLinks = [
    {
      path: "/",
      label: "হোম",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      path: "/chat",
      label: "AI চ্যাট",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      path: "/emergency",
      label: "জরুরি",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="1.8"/>
          <path d="M12 8v4l3 3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      path: "/profile",
      label: "প্রোফাইল",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="7" r="4" strokeWidth="1.8"/>
        </svg>
      )
    }
  ];

  return (
    <div className="phone-nav">
      {navLinks.map((link) => {
        const isActive = location.pathname === link.path;
        return (
          <Link
            key={link.path}
            to={link.path}
            className={`phone-nav-tab ${isActive ? "on" : ""}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
