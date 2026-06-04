import React, { useState, useEffect, useRef } from "react";
import { analyzeSymptomsAPI, transcribeAudioAPI } from "../utils/ai";
import { createRecorder } from "../utils/voice";

export default function SymptomChecker() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: "ai", text: "আস্সালামু আলাইকুম! আপনার কী সমস্যা হচ্ছে? আমি সাহায্য করতে এসেছি। 🌿" }
  ]);
  const [showChips, setShowChips] = useState(true);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const recogRef = useRef(null);
  const recorderRef = useRef(null);
  const chatEndRef = useRef(null);

  const chips = ["জ্বর", "কাঁপুনি", "বমি", "দুর্বলতা", "ঘাম", "মাথাব্যথা"];

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice synthesis (Text to Speech)
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "bn-BD";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  // Handle message submission
  async function handleSend(textToSend) {
    const text = textToSend || input.trim();
    if (!text) return;

    // Append User Message
    const userMsg = { id: Date.now(), sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setShowChips(false);

    try {
      // Call symptom checker API
      const aiResponse = await analyzeSymptomsAPI(text);
      
      // Heuristic Warning Detection (e.g. Dengue risk check)
      let isWarning = false;
      let finalResponse = aiResponse;
      const lowerText = text.toLowerCase();

      if (
        (lowerText.includes("জ্বর") || lowerText.includes("fever")) &&
        (lowerText.includes("কাঁপুনি") || lowerText.includes(" shivering") || lowerText.includes("বমি") || lowerText.includes("vomit"))
      ) {
        isWarning = true;
        finalResponse = "⚠️ ডেঙ্গু বা ম্যালেরিয়ার লক্ষণ দেখা যাচ্ছে। আপনার জ্বর এবং কাঁপুনি/বমি রয়েছে। অনুগ্রহ করে দ্রুত একজন ডাক্তারের পরামর্শ নিন এবং তরল খাবার গ্রহণ করুন।";
      } else if (lowerText.includes("বুকে ব্যথা") || lowerText.includes("chest pain") || lowerText.includes("শ্বাসকষ্ট")) {
        isWarning = true;
        finalResponse = "⚠️ বুকে তীব্র ব্যথা ও শ্বাসকষ্ট হার্ট অ্যাটাকের লক্ষণ হতে পারে! অবিলম্বে আমাদের 'জরুরি' ট্যাব থেকে SOS বাটনে চাপ দিন অথবা সরাসরি ৯৯৯ নম্বরে কল করুন।";
      }

      const aiMsg = { 
        id: Date.now() + 1, 
        sender: "ai", 
        text: finalResponse,
        warn: isWarning
      };

      setMessages((prev) => [...prev, aiMsg]);
      speak(finalResponse);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "ai", text: "দুঃখিত, সংযোগে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" }
      ]);
    } finally {
      setLoading(false);
      setShowChips(true);
    }
  }

  // Web Speech Recognition (Google Speech API direct to browser)
  function toggleListening() {
    if (listening) {
      if (recogRef.current) recogRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("আপনার ব্রাউজারে স্পিচ রিকগনিশন সমর্থন করে না। অনুগ্রহ করে ক্রোম ব্রাউজার ব্যবহার করুন।");
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = "bn-BD";
    recog.interimResults = false;
    recog.onstart = () => setListening(true);
    recog.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + txt : txt));
    };
    recog.onend = () => setListening(false);
    recog.onerror = (err) => {
      console.error(err);
      setListening(false);
    };
    recog.start();
    recogRef.current = recog;
  }

  // Whisper Recorder (Via backend Express server)
  async function toggleRecording() {
    if (recording) {
      // Stop and Transcribe
      setRecording(false);
      if (!recorderRef.current) return;
      
      setLoading(true);
      const tempMsgId = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: tempMsgId, sender: "ai", text: "🎙️ অডিও অনুবাদ করা হচ্ছে, একটু অপেক্ষা করুন..." }
      ]);

      try {
        const blob = await recorderRef.current.stop();
        const text = await transcribeAudioAPI(blob);
        
        // Remove transcription wait message
        setMessages((prev) => prev.filter((m) => m.id !== tempMsgId));

        if (text) {
          setInput((prev) => (prev ? prev + " " + text : text));
        } else {
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), sender: "ai", text: "দুঃখিত, অডিও বুঝতে সমস্যা হয়েছে। আপনার মাইক্রোফোন ও এপিআই কি সঠিক কিনা চেক করুন।" }
          ]);
        }
      } catch (err) {
        console.error(err);
        setMessages((prev) => prev.filter((m) => m.id !== tempMsgId));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Start Recording
    try {
      recorderRef.current = createRecorder();
      await recorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("মাইক্রোফোন অনুমতি দিতে ব্যর্থ হয়েছে।");
    }
  }

  return (
    <div className="chat-body" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="chat-hdr" style={{ margin: "-14px -14px 10px -14px" }}>
        <div className="chat-avatar">🩺</div>
        <div>
          <div className="chat-name">শুরক্ষা AI ডাক্তার</div>
          <div className="chat-online">● অনলাইন</div>
        </div>
        <button 
          className={`chat-mic ${recording ? "text-red-500 animate-pulse" : ""}`}
          onClick={toggleRecording}
          title="অডিও রেকর্ড করুন (Whisper API)"
          style={{ background: "none", border: "none", color: recording ? "var(--red)" : "white" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
            <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "10px" }}>
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.sender === "user" ? "flex-end" : "flex-start" }}>
            <div className="bubble-sender">{m.sender === "user" ? "আপনি" : "শুরক্ষা AI"}</div>
            <div className={`bubble ${m.sender === "ai" ? "ai" : "user"} ${m.warn ? "warn" : ""}`}>
              {m.text}
              {m.sender === "ai" && showChips && m.text.includes("আপনার কী সমস্যা") && (
                <div className="chips-row">
                  {chips.map((c) => (
                    <button key={c} className="chip" onClick={() => handleSend(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div className="bubble-sender">শুরক্ষা AI</div>
            <div className="bubble ai">টাইপ করছে...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Row */}
      <div className="chat-input-row" style={{ margin: "10px -14px -14px -14px" }}>
        <input
          type="text"
          className="chat-box-input"
          placeholder={listening ? "শুনছি... কথা বলুন" : "বাংলায় লিখুন অথবা কথা বলুন..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button 
          className={`mic-btn ${listening ? "recording" : ""}`} 
          onClick={toggleListening}
          title="ব্রাউজার ভয়েস টাইপিং"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {input.trim() && (
          <button className="mic-btn" onClick={() => handleSend()} style={{ background: "var(--green)" }}>
            ➤
          </button>
        )}
      </div>
    </div>
  );
}
