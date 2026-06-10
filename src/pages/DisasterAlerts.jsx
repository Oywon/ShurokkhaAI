import React, { useState, useEffect } from "react";

export default function DisasterAlerts() {
  const [coords, setCoords] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4)
        });
      });
    }
  }, []);

  // Live disaster alerts are not wired up to a backend in this codebase, and
  // the previous version rendered three hardcoded Bengali items as if they
  // were live — which is misleading and potentially dangerous. We now render
  // a clear "no live feed connected" empty state instead of inventing alerts.
  useEffect(() => {
    setAlerts([]);
    setError(null);
    setLoading(false);
  }, []);

  return (
    <div className="scroll-area">
      {/* Header (Disaster Alerts purple style) */}
      <div className="hdr purple">
        <div className="hdr-title">🌩️ দুর্যোগ সতর্কতা</div>
        <div className="hdr-sub">লাইভ আপডেট — বাংলাদেশ</div>
      </div>

      {/* Map Mock representation */}
      <div className="map-mock">
        <div className="map-lines">
          <div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div>
          <div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div>
          <div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div>
          <div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div><div className="map-cell"></div>
        </div>
        <div className="map-pin">📍</div>
        <div className="map-loc-label">
          {coords ? `জিপিএস: ${coords.lat}, ${coords.lng}` : "আপনার অবস্থান"}
        </div>
      </div>

      {/* Empty state — no live alert feed is configured */}
      <div className="alerts-list" role="status" aria-live="polite">
        {loading ? (
          <div className="alert-card" style={{ textAlign: "center", padding: "20px" }}>
            <div className="alert-title">⏳ লোড হচ্ছে...</div>
          </div>
        ) : error ? (
          <div className="alert-card" style={{ textAlign: "center", padding: "20px" }}>
            <div className="alert-title">⚠️ ফিড লোড করা যায়নি</div>
            <div className="alert-desc">{error}</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="alert-card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <div className="alert-title" style={{ marginBottom: 8 }}>🛰️ লাইভ ফিড শীঘ্রই আসছে</div>
            <div className="alert-desc">
              এই মুহূর্তে কোনো সক্রিয় দুর্যোগ সতর্কতা নেই। জরুরি অবস্থায় নিকটস্থ হেল্পলাইনে (999) যোগাযোগ করুন।
            </div>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div key={idx} className={`alert-card ${alert.type}`}>
              <div className="alert-top">
                <div className="alert-title">{alert.title}</div>
                <div className={`badge ${alert.severityClass}`}>{alert.severity}</div>
              </div>
              <div className="alert-desc">{alert.desc}</div>
              <div className="alert-time">{alert.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
