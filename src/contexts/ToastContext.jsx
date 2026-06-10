// Toast notification system for Shurokkha AI.
//
// useToast() returns:
//   toast.success(msg, opts?)  // green checkmark
//   toast.error(msg, opts?)    // red x
//   toast.info(msg, opts?)     // neutral info
//   toast.warning(msg, opts?)  // amber triangle
//   toast.show(msg, { type, duration, action })  // fully custom
//
// Options: { duration: ms (default 3200), action: { label, onClick } }
//
// The provider renders a fixed top-center stack of toasts that auto-dismiss.
// Multiple toasts stack vertically and respect a 4-item cap (oldest evicted).
//
// The provider is intentionally standalone — it can be used outside of
// useAuth. Wrap the whole app in <ToastProvider> in App.jsx.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

const ToastContext = createContext(null);

let _idCounter = 0;
const nextId = () => {
  _idCounter += 1;
  return `t_${Date.now()}_${_idCounter}`;
};

const ICONS = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️"
};

const DEFAULTS = {
  success: 2800,
  error: 4500,
  info: 3200,
  warning: 3800
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (message, opts = {}) => {
      const type = ["success", "error", "info", "warning"].includes(opts.type)
        ? opts.type
        : "info";
      const id = nextId();
      const toast = {
        id,
        message: String(message ?? ""),
        type,
        action: opts.action || null,
        icon: opts.icon || ICONS[type],
        createdAt: Date.now()
      };

      setToasts((prev) => {
        // Cap to 4 visible toasts; drop the oldest.
        const next = [...prev, toast];
        if (next.length > 4) next.shift();
        return next;
      });

      const duration = typeof opts.duration === "number" ? opts.duration : DEFAULTS[type];
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  // Convenience helpers.
  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (m, o) => show(m, { ...(o || {}), type: "success" }),
      error: (m, o) => show(m, { ...(o || {}), type: "error" }),
      info: (m, o) => show(m, { ...(o || {}), type: "info" }),
      warning: (m, o) => show(m, { ...(o || {}), type: "warning" })
    }),
    [show, dismiss]
  );

  // Clear all timers on unmount.
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastHost({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 10000,
        maxWidth: "92vw",
        width: 360,
        pointerEvents: "none"
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const palette = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a8a" },
    warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" }
  };
  const c = palette[toast.type] || palette.info;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        fontSize: 13,
        lineHeight: 1.35,
        pointerEvents: "auto",
        animation: "shurokkha-toast-in 220ms ease-out"
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>
        {toast.icon}
      </span>
      <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {toast.message}
      </span>
      {toast.action && toast.action.label && (
        <button
          type="button"
          onClick={() => {
            try { toast.action.onClick && toast.action.onClick(); } catch (_) {}
            onDismiss(toast.id);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: c.border,
            fontWeight: 700,
            cursor: "pointer",
            padding: "0 4px",
            textDecoration: "underline"
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="বন্ধ"
        style={{
          background: "transparent",
          border: "none",
          color: c.text,
          opacity: 0.6,
          cursor: "pointer",
          padding: 0,
          fontSize: 14,
          lineHeight: 1
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op fallback for components rendered outside the provider
    // (shouldn't happen in production, but keeps tests/components robust).
    return {
      show: () => "",
      dismiss: () => {},
      success: () => "",
      error: () => "",
      info: () => "",
      warning: () => ""
    };
  }
  return ctx;
}
