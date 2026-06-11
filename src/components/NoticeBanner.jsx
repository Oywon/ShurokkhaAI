import React, { useEffect, useState } from "react";

/**
 * Global dismissible notice for app-wide announcements (e.g. the temporary
 * phone-OTP billing outage). Dismissal state is persisted to localStorage so
 * the user only sees it once until the version key changes.
 *
 * Props:
 *   - id:   string, used as the localStorage key (bump the version suffix
 *           to re-show to everyone, e.g. "phone-otp-notice-v2").
 *   - children: banner body content.
 */
export default function NoticeBanner({ id, children }) {
  const storageKey = `notice-dismissed:${id}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch (_) {
      return false;
    }
  });

  // Re-read on mount in case the id prop changed between renders.
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch (_) {
      /* localStorage unavailable */
    }
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch (_) {
      /* localStorage unavailable */
    }
    setDismissed(true);
  };

  return (
    <div className="notice-banner" role="status" aria-live="polite">
      <div className="notice-banner__icon" aria-hidden="true">⚠️</div>
      <div className="notice-banner__body">{children}</div>
      <button
        type="button"
        className="notice-banner__close"
        onClick={handleDismiss}
        aria-label="Dismiss notice"
      >
        ×
      </button>
    </div>
  );
}
