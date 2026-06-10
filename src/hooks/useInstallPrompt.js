import { useEffect, useState } from "react";

// Listens for the `beforeinstallprompt` event so we can show a non-intrusive
// "install our app" banner. The browser fires this only when the PWA passes
// its installability checks (manifest, service worker, https). We also honor
// a 7-day dismiss cooldown via localStorage.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed as a PWA?
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator?.standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Recently dismissed?
    try {
      const lastDismissed = Number(localStorage.getItem("shurokkha.installDismissedAt") || 0);
      if (lastDismissed && Date.now() - lastDismissed < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    } catch {}

    function onPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    function onAppInstalled() {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setVisible(false);
      return choice?.outcome === "accepted";
    } catch {
      setVisible(false);
      return false;
    }
  }

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem("shurokkha.installDismissedAt", String(Date.now())); } catch {}
  }

  return { visible, installed, promptInstall, dismiss };
}
