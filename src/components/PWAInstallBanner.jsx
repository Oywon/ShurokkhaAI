import React from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * Non-intrusive bottom banner that prompts the user to install the PWA.
 * The browser fires `beforeinstallprompt` only when the app passes the
 * installability checks (manifest + service worker + https). On Chrome
 * Android this lets us show our own button instead of the address-bar
 * mini-infobar. iOS Safari has no `beforeinstallprompt` event so this
 * banner simply won't appear there — iOS users install via Share → Add
 * to Home Screen.
 */
export default function PWAInstallBanner() {
  const { visible, installed, promptInstall, dismiss } = useInstallPrompt();

  if (!visible || installed) return null;

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label="Install Shurokkha AI"
    >
      <div className="pwa-install-icon" aria-hidden="true">
        <img src="/logo192.png" alt="" />
      </div>
      <div className="pwa-install-body">
        <div className="pwa-install-title">Install Shurokkha AI</div>
        <div className="pwa-install-sub">
          অফলাইনে ব্যবহার করুন · দ্রুত লোড · পূর্ণ স্ক্রিন
        </div>
      </div>
      <button
        type="button"
        className="pwa-install-btn"
        onClick={async () => {
          const ok = await promptInstall();
          if (!ok) dismiss();
        }}
      >
        Install
      </button>
      <button
        type="button"
        className="pwa-install-close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
