import React, { useState } from "react";
import { db } from "../firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export default function Emergency() {
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  async function sendSOS() {
    if (!('geolocation' in navigator)) {
      setMessage('Geolocation not supported by this browser.');
      return;
    }
    setSending(true);
    setMessage('Requesting location...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        await addDoc(collection(db, 'sos'), {
          userId: currentUser?.uid || null,
          lat,
          lng,
          createdAt: serverTimestamp(),
        });
        setMessage('SOS sent. Help is being alerted.');
      } catch (err) {
        console.error(err);
        setMessage('Failed to send SOS.');
      }
      setSending(false);
    }, (err) => {
      console.error(err);
      setMessage('Unable to retrieve location.');
      setSending(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  return (
    <div>
      <h1 className="page-title bengali">জরুরি সেবা</h1>
      <p className="page-subtitle bengali">বিপদে পড়লে এক ট্যাপে সাহায্য নিন</p>

      <div className="card" style={{ textAlign: 'center', padding: 36 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🆘</div>
        <div className="bengali" style={{ fontSize: 20, fontWeight: 700, color: '#D93025', marginBottom: 8 }}>জরুরি SOS</div>
        <p className="bengali" style={{ color: '#4A6A4A', marginBottom: 24 }}>আপনার অবস্থান শেয়ার করে জরুরি সাহায্য চান</p>

        <button className="btn-emergency" onClick={sendSOS} disabled={sending}>{sending ? 'Sending...' : 'Send SOS'}</button>

        {message && <div style={{marginTop:16}} className="bengali">{message}</div>}
      </div>
    </div>
  );
}