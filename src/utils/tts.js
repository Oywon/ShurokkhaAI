// TTS (Text-to-Speech) helpers for Shurokkha AI.
//
// Why this file exists:
//   - The SymptomChecker chat calls window.speechSynthesis.speak() with raw AI text.
//     That raw text contains URLs, code fences, markdown markers, emoji, and the
//     Bengali script itself. The default TTS engine on most Android/Chrome devices
//     has NO Bengali voice installed, so feeding it Bengali script results in
//     silence or garbled noise.
//   - It also reads "." and "/" out loud ("dot", "slash") because the original
//     AI text wasn't sanitized.
//
// What this module does:
//   1. sanitizeForTTS(text): strips URLs, code fences, markdown, emoji, list
//      prefixes, and "loud" punctuation. Replaces bullets with commas. Collapses
//      whitespace.
//   2. toBanglish(text): best-effort Bengali (Bangla) script → Latin (Banglish)
//      transliteration so an English TTS voice can pronounce the words. Returns
//      the original text unchanged if it has no Bengali characters (e.g. an
//      already-English response).
//   3. pickBengaliVoice(): returns the best bn-* SpeechSynthesisVoice, or null.
//   4. speak(text, opts): one-shot speak with the right voice. Cancels any
//      in-flight utterance first so double-tapping the 🔊 button doesn't queue.

const LANG_PRIMARY = "bn-BD";

// --- Sanitizer ------------------------------------------------------------

// Replace bullets with commas so "• fever" becomes ", fever" (sounds natural).
// Strip URLs (http(s)://, www., bare domains like example.com/path).
// Strip code fences and inline code.
// Strip markdown markers, emoji, repeated punctuation.
// Strip numeric list prefixes (1. , 2) , 3: ).
// Convert remaining ".", "/" near digits to spaces (so "1.5" -> "1 5",
// "2024/01/15" -> "2024 01 15"). We don't kill ALL dots/slashes because
// they can be sentence terminators — but we do strip trailing "." noise
// and any standalone "." / "/" between words.
export function sanitizeForTTS(raw) {
  if (!raw) return "";
  let text = String(raw);

  // Code fences (```...```) — drop entirely.
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Inline code (`...`) — keep the inside, drop backticks.
  text = text.replace(/`+/g, "");

  // Markdown links — keep the label, drop the URL.
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  // Bare URLs.
  text = text.replace(/https?:\/\/\S+/gi, " ");
  text = text.replace(/\bwww\.\S+/gi, " ");
  // Bare domain.tld references (no scheme) — be conservative, only when followed by whitespace/end.
  text = text.replace(/\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|bd|gov|edu|co|info)(?:\/\S*)?/gi, " ");

  // Markdown headers, bold, italic, blockquote markers.
  text = text.replace(/^[#>*\s-]+/gm, "");
  text = text.replace(/[*_~]+/g, "");

  // List prefixes like "1. ", "2) ", "3: " at the start of a line.
  text = text.replace(/(^|\s)\d{1,3}\s*[.)]\s+/g, "$1");

  // Bullets/dashes at line starts -> commas (so the TTS pauses naturally).
  text = text.replace(/^\s*[•·●▪◦–—-]\s*/gm, ", ");

  // Emoji & pictographic ranges.
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "");

  // Smart quotes -> straight (some TTS engines read "“" weirdly).
  text = text.replace(/[“”‘’]/g, "'");

  // Dots/slashes between digits (decimals, dates, version numbers) -> spaces.
  text = text.replace(/(\d)[./](\d)/g, "$1 $2");

  // Stray repeated punctuation -> single.
  text = text.replace(/([.!?])\1+/g, "$1");
  text = text.replace(/[,;:]\s*[,;:]+/g, ", ");

  // Replace any remaining standalone "." or "/" (not at end of a number)
  // with a space — this is the fix for the user's "dot / slash" complaint.
  // We preserve "." that ends a sentence by converting it to a longer pause
  // via " ... " only when followed by space + capital; otherwise a space.
  text = text.replace(/\s*\/\s*/g, " ");
  text = text.replace(/\s*\.\s*(?=[A-Za-z\u0980-\u09FF])/g, ". "); // sentence end ok
  text = text.replace(/\s*\.\s*$/g, ""); // trailing dot
  // Any leftover stray dots in the middle of words:  a.b -> a b
  text = text.replace(/([A-Za-z\u0980-\u09FF])\.([A-Za-z\u0980-\u09FF])/g, "$1 $2");

  // Collapse whitespace.
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// --- Voice selection ------------------------------------------------------
//
// We do NOT transliterate Bengali to Latin (Banglish). The user wants
// native Bangla pronunciation only. If the device has no bn-* voice
// installed, speak() returns "no-voice" and the caller should surface a
// helpful message.

let _voicesCache = null;
let _voicesReady = false;

// Some browsers populate getVoices() asynchronously after `voiceschanged`.
// We hold a one-time promise so the first user tap on 🔊 waits for voices.
function getVoicesReady() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  if (_voicesCache && _voicesReady) return Promise.resolve(_voicesCache);
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      _voicesCache = window.speechSynthesis.getVoices() || [];
      _voicesReady = true;
      resolve(_voicesCache);
    };
    const initial = window.speechSynthesis.getVoices();
    if (initial && initial.length) {
      finish();
      return;
    }
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    // Hard timeout — never block the UI more than 800ms waiting for voices.
    setTimeout(finish, 800);
  });
}

export function pickBengaliVoice(voices) {
  if (!voices || !voices.length) return null;
  // Prefer exact bn-BD, then bn-IN, then anything starting with bn.
  return (
    voices.find((v) => /^bn[-_]BD/i.test(v.lang)) ||
    voices.find((v) => /^bn[-_]IN/i.test(v.lang)) ||
    voices.find((v) => /^bn/i.test(v.lang)) ||
    null
  );
}

// --- Public speak() -------------------------------------------------------
//
// Returns a status string the caller can switch on:
//   "spoken"     — bn-* voice available, Bengali script queued
//   "fallback"   — no bn-* voice on this device, but we still speak the
//                  Bengali text with the engine's default voice under a
//                  bn-BD lang tag. The engine may produce garbled output
//                  (Chrome desktop has no Bengali voice), but at least the
//                  user hears something. The UI can show a non-blocking
//                  hint that pronunciation may be inaccurate.
//   "empty"      — input was empty after sanitization
//   "unsupported"— browser has no speechSynthesis
//
// Policy: we ALWAYS speak (we never refuse, we never transliterate). The
// bn-BD lang tag is what tells the engine "this is Bengali, use Bengali
// phonology if your voice supports it." If the voice can't, the user gets
// honest feedback (silent/garbled) plus a one-time hint.

let _activeUtterance = null;

export async function speak(rawText, opts = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return "unsupported";
  }
  const clean = sanitizeForTTS(rawText);
  if (!clean) return "empty";

  // Stop anything currently speaking so double-tap doesn't queue.
  window.speechSynthesis.cancel();

  const voices = await getVoicesReady();
  const bnVoice = pickBengaliVoice(voices);

  const utterance = new SpeechSynthesisUtterance(clean);
  if (bnVoice) {
    utterance.lang = bnVoice.lang || LANG_PRIMARY;
    utterance.voice = bnVoice;
  } else {
    // No bn-* voice: set the lang tag and let the engine pick its default
    // voice. This is the honest Web Speech API behavior on a device that
    // doesn't ship a Bengali voice — we don't pretend, and we don't
    // transliterate to Banglish.
    utterance.lang = LANG_PRIMARY;
  }
  utterance.rate = typeof opts.rate === "number" ? opts.rate : 0.95;
  utterance.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
  utterance.volume = typeof opts.volume === "number" ? opts.volume : 1.0;

  utterance.onend = () => {
    if (_activeUtterance === utterance) _activeUtterance = null;
  };
  utterance.onerror = (e) => {
    // 'canceled' / 'interrupted' fire on cancel(); ignore.
    if (e && e.error && e.error !== "canceled" && e.error !== "interrupted") {
      // eslint-disable-next-line no-console
      console.warn("[TTS] speak error:", e.error);
    }
    if (_activeUtterance === utterance) _activeUtterance = null;
  };

  _activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return bnVoice ? "spoken" : "fallback";
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  _activeUtterance = null;
  window.speechSynthesis.cancel();
}

export function isSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
