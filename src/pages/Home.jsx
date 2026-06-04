import React from "react";
import { Link } from "react-router-dom";

const features = [
  { icon: "💬", titleBn: "AI স্বাস্থ্য সহায়তা", titleEn: "AI Health Assistant", desc: "লক্ষণ বলুন, AI পরামর্শ দেবে বাংলায়" },
  { icon: "🆘", titleBn: "জরুরি SOS", titleEn: "Emergency SOS", desc: "এক ট্যাপে সাহায্য, location শেয়ার" },
  { icon: "🌊", titleBn: "দুর্যোগ সতর্কতা", titleEn: "Disaster Alerts", desc: "বন্যা, ঘূর্ণিঝড়ের real-time আপডেট" },
  { icon: "🏥", titleBn: "নিকটস্থ হাসপাতাল", titleEn: "Nearby Hospitals", desc: "কাছের হাসপাতাল ও আশ্রয়কেন্দ্র খুঁজুন" },
  { icon: "🎙️", titleBn: "ভয়েস সহায়তা", titleEn: "Voice Support", desc: "বলুন, AI শুনবে — অক্ষরজ্ঞান লাগবে না" },
  { icon: "💊", titleBn: "ওষুধ রিমাইন্ডার", titleEn: "Medicine Reminder", desc: "প্রেসক্রিপশন স্ক্যান, সময়মতো reminder" },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div className="bengali" style={styles.heroTag}>🇧🇩 বাংলাদেশের জন্য তৈরি</div>
          <h1 className="bengali" style={styles.heroTitle}>
            সুরক্ষা AI
          </h1>
          <p style={styles.heroSub}>
            Your Bengali Health & Emergency Companion
          </p>
          <p className="bengali" style={styles.heroDesc}>
            স্বাস্থ্য পরামর্শ, জরুরি সাহায্য, দুর্যোগ সতর্কতা —<br />
            সব এক জায়গায়, বাংলায়
          </p>
          <div style={styles.heroBtns}>
            <Link to="/dashboard" style={styles.btnPrimary}>
              শুরু করুন →
            </Link>
            <Link to="/emergency" style={styles.btnEmergency}>
              🆘 জরুরি সাহায্য
            </Link>
          </div>
        </div>
        <div style={styles.heroImage}>🏥</div>
      </div>

      {/* Features grid */}
      <h2 className="bengali" style={styles.sectionTitle}>কী কী পাবেন</h2>
      <div style={styles.grid}>
        {features.map((f, i) => (
          <div key={i} style={styles.featureCard}>
            <div style={styles.featureIcon}>{f.icon}</div>
            <div className="bengali" style={styles.featureTitleBn}>{f.titleBn}</div>
            <div style={styles.featureTitleEn}>{f.titleEn}</div>
            <p className="bengali" style={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div style={styles.ctaBanner}>
        <div className="bengali" style={styles.ctaText}>
          যেকোনো পরিস্থিতিতে, যেকোনো সময় — সুরক্ষা AI আপনার পাশে আছে
        </div>
        <Link to="/emergency" style={styles.ctaBtn}>
          🆘 এখনই সাহায্য নিন
        </Link>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: "linear-gradient(135deg, #1B6B4A 0%, #0F4A32 100%)",
    borderRadius: 20,
    padding: "48px 40px",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
    gap: 24,
  },
  heroContent: { flex: 1 },
  heroTag: {
    fontSize: 13,
    background: "rgba(255,255,255,0.15)",
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    marginBottom: 16,
    fontWeight: 500,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 18,
    opacity: 0.85,
    marginBottom: 12,
  },
  heroDesc: {
    fontSize: 15,
    opacity: 0.75,
    lineHeight: 1.7,
    marginBottom: 28,
  },
  heroBtns: { display: "flex", gap: 12, flexWrap: "wrap" },
  btnPrimary: {
    background: "white",
    color: "#1B6B4A",
    textDecoration: "none",
    padding: "12px 24px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
  },
  btnEmergency: {
    background: "#D93025",
    color: "white",
    textDecoration: "none",
    padding: "12px 24px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
  },
  heroImage: {
    fontSize: 100,
    opacity: 0.3,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0F4A32",
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    border: "1px solid #D4E8D4",
    boxShadow: "0 2px 8px rgba(27,107,74,0.08)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  featureIcon: { fontSize: 36, marginBottom: 12 },
  featureTitleBn: {
    fontSize: 17,
    fontWeight: 700,
    color: "#0F4A32",
    marginBottom: 2,
  },
  featureTitleEn: {
    fontSize: 12,
    color: "#7A9A7A",
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: "#4A6A4A",
    lineHeight: 1.6,
  },
  ctaBanner: {
    background: "#D93025",
    borderRadius: 16,
    padding: "28px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  ctaText: {
    color: "white",
    fontSize: 16,
    fontWeight: 600,
    flex: 1,
  },
  ctaBtn: {
    background: "white",
    color: "#D93025",
    textDecoration: "none",
    padding: "12px 24px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    whiteSpace: "nowrap",
  },
};