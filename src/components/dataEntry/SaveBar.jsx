import React from "react";

/**
 * SaveBar
 * -------
 * The bottom action strip that holds the primary save button.
 *
 * Props
 *  - saving : boolean — disables the button while a save is in flight
 *  - onSave : () => void — invoked on click (form submit handles the actual save)
 *  - label  : optional text override for the button
 */
export default function SaveBar({ saving, label = "তথ্য সংরক্ষণ করুন" }) {
  return (
    <div className="save-bar">
      <button type="submit" className="auth-btn-primary" disabled={saving}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="17 21 17 13 7 13 7 21"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="7 3 7 8 15 8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {saving ? "সংরক্ষণ করা হচ্ছে..." : label}
      </button>
    </div>
  );
}
