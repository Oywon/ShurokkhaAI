import React, { useState, useEffect, useRef } from "react";
import { analyzeSymptomsAPI, transcribeAudioAPI } from "../utils/ai";
import { createRecorder } from "../utils/voice";
import { speak as speakTTS, stopSpeaking } from "../utils/tts";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

const TTS_STORAGE_KEY = "shurokkha.tts.enabled";
const CHAT_STORAGE_PREFIX = "shurokkha.chat."; // + uid (or "guest")
const CHAT_HISTORY_MAX = 100; // cap to keep localStorage small
const WELCOME_MSG = {
  id: 1,
  sender: "ai",
  text: "আস্সালামু আলাইকুম! আপনার কী সমস্যা হচ্ছে? আমি সাহায্য করতে এসেছি। 🌿",
};

function chatKey(uid) {
  return CHAT_STORAGE_PREFIX + (uid || "guest");
}

// Sanitization, voice selection, and Banglish fallback all live in
// src/utils/tts.js so they can be unit-tested and reused by other pages.

export default function SymptomChecker() {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [input, setInput] = useState("");
  // Lazy init: read chat history from localStorage so the conversation
  // survives page reloads. Falls back to the welcome message on first visit
  // or if stored data is corrupt.
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(chatKey(currentUser?.uid));
      if (!raw) return [WELCOME_MSG];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalize: ensure all messages have a usable id/sender/text shape
        const clean = parsed
          .filter((m) => m && typeof m === "object" && typeof m.text === "string")
          .slice(-CHAT_HISTORY_MAX)
          .map((m, i) => ({
            id: m.id ?? i + 1,
            sender: m.sender === "user" ? "user" : "ai",
            text: String(m.text),
            warn: !!m.warn,
          }));
        if (clean.length > 0) return clean;
      }
    } catch (err) {
      console.warn("Chat history could not be loaded:", err);
    }
    return [WELCOME_MSG];
  });
  const [showChips, setShowChips] = useState(true);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  // TTS is OFF by default — the previous version auto-spoke every reply,
  // which surprised users in quiet environments. Now user must opt in.
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try { return localStorage.getItem(TTS_STORAGE_KEY) === "1"; }
    catch { return false; }
  });

  const recogRef = useRef(null);
  const recorderRef = useRef(null);
  const chatEndRef = useRef(null);

  const chips = ["জ্বর", "কাঁপুনি", "বমি", "দুর্বলতা", "ঘাম", "মাথাব্যথা"];

  // Scroll to bottom on new messages. Use rAF + a second frame so layout has
  // settled (flex + min-height:0 chains can need a second pass to size
  // correctly when a long message wraps the line count).
  useEffect(() => {
    const scroll = () => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
  }, [messages]);

  // Persist TTS preference
  useEffect(() => {
    try { localStorage.setItem(TTS_STORAGE_KEY, ttsEnabled ? "1" : "0"); } catch {}
    if (!ttsEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [ttsEnabled]);

  // Persist chat history (per user; key changes when user changes so guest
  // and authenticated chats never mix). Cap to last N messages to keep
  // localStorage size predictable.
  useEffect(() => {
    try {
      const capped = messages.slice(-CHAT_HISTORY_MAX);
      localStorage.setItem(chatKey(currentUser?.uid), JSON.stringify(capped));
    } catch (err) {
      // Storage may be full or disabled (private mode). Non-fatal.
      console.warn("Chat history could not be saved:", err);
    }
  }, [messages, currentUser?.uid]);

  // When the user signs in or out, swap the in-memory chat for the
  // correct bucket so each account sees its own history.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatKey(currentUser?.uid));
      if (!raw) {
        setMessages([WELCOME_MSG]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-CHAT_HISTORY_MAX));
      } else {
        setMessages([WELCOME_MSG]);
      }
    } catch {
      setMessages([WELCOME_MSG]);
    }
    // We only want to re-run this on user change, not on every message update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  function clearHistory() {
    try {
      localStorage.removeItem(chatKey(currentUser?.uid));
    } catch {}
    setMessages([WELCOME_MSG]);
    stopSpeaking();
    toast.success("চ্যাট ইতিহাস মুছে ফেলা হয়েছে");
  }

  // Voice synthesis (Text to Speech) — only speaks if the user has enabled it.
  // All sanitization and voice selection is handled by src/utils/tts.js.
  // The utility ALWAYS speaks (never transliterates, never refuses). If no
  // Bengali voice is installed, the engine reads Bengali script with its
  // default voice and may produce garbled output — we surface a non-blocking
  // hint in that case so the user knows pronunciation may be off.
  function speak(text) {
    if (!ttsEnabled) return;
    speakTTS(text).then((status) => {
      if (status === "fallback") {
        toast.warn(
          "আপনার ডিভাইসে বাংলা ভয়েস পাওয়া যায়নি — উচ্চারণ সঠিক না হতে পারে। Settings → Language → Text-to-speech output থেকে একটি bn-BD ভয়েস ইনস্টল করলে সেরা ফল পাবেন।"
        );
      } else if (status === "unsupported") {
        toast.warn("এই ব্রাউজারে টেক্সট-টু-স্পিচ সমর্থিত নয়।");
      }
    });
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
      toast.error("আপনার ব্রাউজারে স্পিচ রিকগনিশন সমর্থন করে না। অনুগ্রহ করে ক্রোম ব্রাউজার ব্যবহার করুন।");
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
      toast.error("মাইক্রোফোন অনুমতি দিতে ব্যর্থ হয়েছে।");
    }
  }

  return (
    <div className="chat-body">
      {/* Header */}
      <div className="chat-hdr">
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
        <button
          onClick={() => setTtsEnabled((v) => !v)}
          aria-pressed={ttsEnabled}
          aria-label={ttsEnabled ? "স্বয়ং পড়া বন্ধ করুন" : "স্বয়ং পড়া চালু করুন"}
          title={ttsEnabled ? "স্বয়ং পড়া: চালু" : "স্বয়ং পড়া: বন্ধ"}
          style={{
            background: ttsEnabled ? "rgba(255,255,255,0.25)" : "transparent",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "white",
            borderRadius: "999px",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          {ttsEnabled ? "🔊 চালু" : "🔇 বন্ধ"}
        </button>
        <button
          onClick={clearHistory}
          aria-label="চ্যাট ইতিহাস মুছুন"
          title="চ্যাট ইতিহাস মুছুন"
          className="chat-clear-btn"
        >
          🗑
        </button>
      </div>

      {/* Messages — the ONLY scroll region. flex:1 + min-height:0 makes
          the parent flex column give this element the remaining space and
          never grow when new messages arrive. */}
      <div className="chat-messages">
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
            {m.sender === "ai" && (
              <button
                onClick={() => {
                  // Allow replay even when auto-speak is off, so the user can
                  // still hear the answer once without enabling TTS globally.
                  speakTTS(m.text).then((status) => {
                    if (status === "fallback") {
                      toast.warn(
                        "আপনার ডিভাইসে বাংলা ভয়েস পাওয়া যায়নি — উচ্চারণ সঠিক না হতে পারে। Settings → Language → Text-to-speech output থেকে একটি bn-BD ভয়েস ইনস্টল করলে সেরা ফল পাবেন।"
                      );
                    } else if (status === "unsupported") {
                      toast.warn("এই ব্রাউজারে টেক্সট-টু-স্পিচ সমর্থিত নয়।");
                    }
                  });
                }}
                title="এই উত্তরটি আবার শুনুন"
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                🔊 শুনুন
              </button>
            )}
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

      {/* Input Row — flex:0 0 auto so it stays pinned at the bottom and
          never gets squeezed by the scroll area. */}
      <div className="chat-input-row">
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
