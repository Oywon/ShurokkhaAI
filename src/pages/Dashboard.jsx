import React from "react";

export default function Dashboard() {
  return (
    <div>
      <h1 className="page-title bengali">ড্যাশবোর্ড</h1>
      <p className="page-subtitle bengali">
        আপনার স্বাস্থ্য তথ্য ও AI সহায়তা এখানে পাবেন
      </p>
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <div className="bengali" style={{ fontSize: 18, fontWeight: 600, color: "#1B6B4A", marginBottom: 8 }}>
          AI স্বাস্থ্য সহায়তা
        </div>
        <p className="bengali" style={{ color: "#4A6A4A", marginBottom: 24 }}>
          Step 2-এ এই feature যোগ হবে
        </p>
        <div style={{
          background: "#F5F7F5",
          border: "2px dashed #D4E8D4",
          borderRadius: 12,
          padding: 24,
          color: "#7A9A7A",
          fontSize: 14
        }}>
          AI Healthcare Assistant — Coming in Step 2
        </div>
      </div>
    </div>
  );
}