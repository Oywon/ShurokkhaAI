import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyzeSymptomsAPI, transcribeAudioAPI } from '../utils/ai';
import { createRecorder } from '../utils/voice';

export default function SymptomChecker() {
  const { currentUser } = useAuth();
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function analyzeSymptoms() {
    const trimmed = input.trim();
    if (!trimmed) {
      setResult('দয়া করে আপনার উপসর্গ লিখুন।');
      return;
    }
    setResult('Analyzing...');
    (async () => {
      const ai = await analyzeSymptomsAPI(trimmed);
      const out = ai || `আলোচ্য উপসর্গ: ${trimmed}\nপ্রাথমিক পরামর্শ: অনুগ্রহ করে নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।`;
      setResult(out);
      speak(out);
    })();
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResult('Speech recognition not supported in this browser.');
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = 'bn-BD';
    recog.interimResults = false;
    recog.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + txt : txt));
    };
    recog.onend = () => setListening(false);
    recog.start();
    recogRef.current = recog;
    setListening(true);
  }

  // Optional: record audio and send to transcription endpoint
  const recorderRef = useRef(null);
  async function startRecording() {
    recorderRef.current = createRecorder();
    try {
      await recorderRef.current.start();
      setResult('Recording...');
    } catch (err) {
      console.error(err);
      setResult('Recording failed or permission denied.');
    }
  }

  async function stopRecordingAndTranscribe() {
    if (!recorderRef.current) return;
    const blob = await recorderRef.current.stop();
    setResult('Transcribing...');
    const text = await transcribeAudioAPI(blob);
    if (text) {
      setInput((prev) => (prev ? prev + ' ' + text : text));
      setResult('Transcription complete.');
    } else {
      setResult('Transcription not available.');
    }
  }

  function stopListening() {
    if (recogRef.current) recogRef.current.stop();
    setListening(false);
  }

  return (
    <div>
      <h1 className="page-title bengali">উপসর্গ পরীক্ষা</h1>
      <p className="page-subtitle bengali">আপনার উপসর্গ লিখে বা বলেই দ্রুত প্রাথমিক পরামর্শ পান</p>

      <div className="card" style={{ padding: 24 }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={6} className="w-full p-3 rounded-md" placeholder="উদাহরণ: আমি জ্বরে ভুগছি এবং কাশি আছে..."></textarea>
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" onClick={analyzeSymptoms}>Analyze</button>
          {!listening ? (
            <button className="btn-secondary" onClick={startListening}>🎤 Start voice</button>
          ) : (
            <button className="btn-secondary" onClick={stopListening}>⏹ Stop</button>
          )}
          <button className="btn-secondary" onClick={startRecording}>● Record</button>
          <button className="btn-secondary" onClick={stopRecordingAndTranscribe}>■ Stop & Transcribe</button>
          <button className="btn-ghost" onClick={() => { setInput(''); setResult(null); }}>Clear</button>
        </div>

        {result && (
          <div className="mt-4 p-3 rounded-md bg-gray-50">
            <pre className="whitespace-pre-wrap bengali">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
