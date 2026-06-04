import React, { useState, useEffect } from "react";

export default function DisasterAlerts() {
  const [coords, setCoords] = useState(null);

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

  const alerts = [
    {
      type: "flood",
      title: "🌊 বন্যা সতর্কতা — সিলেট",
      severity: "উচ্চ",
      severityClass: "high",
      desc: "সুরমা নদীর পানি বিপদসীমার উপরে প্রবাহিত হচ্ছে। নিচু এলাকার বাসিন্দাদের দ্রুত নিকটস্থ আশ্রয়কেন্দ্রে আশ্রয় নেওয়ার অনুরোধ করা হলো।",
      time: "আজ, সকাল ৮:৩০"
    },
    {
      type: "cyclone",
      title: "🌀 ঘূর্ণিঝড় — চট্টগ্রাম",
      severity: "মাঝারি",
      severityClass: "med",
      desc: "চট্টগ্রাম ও সংলগ্ন উপকূলীয় এলাকায় ৪ নম্বর স্থানীয় হুঁশিয়ারি সংকেত জারি করা হয়েছে। মাছ ধরার ট্রলারসমূহকে নিরাপদ আশ্রয়ে থাকতে বলা হয়েছে।",
      time: "গতকাল, রাত ১১:০০"
    },
    {
      type: "heat",
      title: "🌡️ তাপপ্রবাহ — রাজশাহী",
      severity: "নিম্ন",
      severityClass: "low",
      desc: "রাজশাহী ও পার্শ্ববর্তী অঞ্চলে তীব্র দাবদাহ বিরাজ করছে। দুপুর ১২টা থেকে ৩টা পর্যন্ত জরুরি প্রয়োজন ছাড়া সরাসরি রোদে না যাওয়ার পরামর্শ দেওয়া হচ্ছে।",
      time: "২ দিন আগে"
    }
  ];

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

      {/* Alerts list */}
      <div className="alerts-list">
        {alerts.map((alert, idx) => (
          <div key={idx} className={`alert-card ${alert.type}`}>
            <div className="alert-top">
              <div className="alert-title">{alert.title}</div>
              <div className={`badge ${alert.severityClass}`}>{alert.severity}</div>
            </div>
            <div className="alert-desc">{alert.desc}</div>
            <div className="alert-time">{alert.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
