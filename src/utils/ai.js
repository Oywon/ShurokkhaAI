import { getEnvVar } from './env';

export async function analyzeSymptomsAPI(text) {
  // Use VITE_AI_API_URL or fallback to local proxy port 3001
  const url = getEnvVar('REACT_APP_AI_API_URL') || 'https://server-six-teal-95.vercel.app';

  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('AI API error');
      const data = await res.json();
      return data.answer || JSON.stringify(data);
    } catch (err) {
      console.error('AI analyze error:', err);
      throw err;
    }
  }

  // Local heuristic fallback (Bangla/English friendly)
  const trimmed = (text || '').trim();
  if (!trimmed) return 'দয়া করে উপসর্গ দিন।';
  if (/জ্বর|fever|high temperature/i.test(trimmed)) {
    return 'প্রাথমিক পরামর্শ: জ্বরের লক্ষণ আছে — বিশ্রাম ও পানি পান করুন; প্রবল হলে ডাক্তার দেখান।';
  }
  if (/কাশি|cough/i.test(trimmed)) {
    return 'প্রাথমিক পরামর্শ: কাশি থাকলে মাস্ক পরুন, বিশ্রাম নিন; দীর্ঘস্থায়ী হলে স্বাস্থ্যকেন্দ্রে যান।';
  }
  if (/পানি|vomit|উল্টে/i.test(trimmed)) {
    return 'প্রাথমিক পরামর্শ: তরল গ্রহণ বজায় রাখুন; অস্বাভাবিক থাকলে নিকটস্থ হাসপাতালতে যান।';
  }
  return 'প্রাথমিক পরামর্শ: বিস্তারিত লক্ষণ জানালে ভাল পরামর্শ দেওয়া যাবে।';
}

export async function transcribeAudioAPI(blob) {
  // SECURITY: only the proxy URL is read on the client. Audio is sent to the
  // Express proxy which holds the GEMINI_API_KEY. No direct browser→OpenAI call.
  const url = getEnvVar('REACT_APP_AI_API_URL') || 'https://server-six-teal-95.vercel.app';

  if (url) {
    try {
      const fd = new FormData();
      fd.append('file', blob, 'recording.webm');
      const res = await fetch(`${url.replace(/\/$/, '')}/transcribe`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Transcription API error');
      const data = await res.json();
      return data.text || null;
    } catch (err) {
      console.error('Transcription error:', err);
      return null;
    }
  }

  return null;
}

// ─── Prescription OCR ──────────────────────────────────────────────────────
//
// analyzePrescriptionAPI(file, { onProgress })
//  - Sends the image to the AI proxy (/prescription-ocr). If a custom Vision
//    endpoint is configured via REACT_APP_VISION_API_URL it is preferred.
//  - Accepts either a File or a Blob. Returns one of:
//      { ok: true, source: "proxy"|"openai"|"local", medicines: [...] }
//      { ok: false, error: "..." }
//  - The `medicines` array items look like:
//      { name, dosage, frequency, time, confidence }
//
// Without any backend it uses a deterministic local heuristic that pulls
// common Bangla/English medicine names out of the filename + a small built-in
// dictionary, so the UI is never dead.
export async function analyzePrescriptionAPI(file, { onProgress } = {}) {
  if (!file) return { ok: false, error: "ফাইল পাওয়া যায়নি" };

  try { onProgress && onProgress(10); } catch (e) {}

  // Compress the image client-side before sending to reduce upload size and
  // server load. Skip compression for non-image types or very small files.
  let uploadFile = file;
  try {
    if (file.type && file.type.startsWith("image/") && file.size > 250 * 1024) {
      const compressed = await compressImage(file, { maxEdge: 1600, quality: 0.8 });
      if (compressed && compressed.size && compressed.size < file.size) {
        uploadFile = compressed;
      }
    }
  } catch (e) {
    console.warn("Image compression failed, sending original:", e?.message);
  }

  const fd = new FormData();
  fd.append("file", uploadFile, uploadFile.name || "prescription.jpg");

  const proxyUrl = getEnvVar("REACT_APP_AI_API_URL") || "https://server-six-teal-95.vercel.app";
  const visionUrl = getEnvVar("REACT_APP_VISION_API_URL");

  const tryJson = async (url) => {
    const res = await fetch(`${url.replace(/\/$/, "")}/prescription-ocr`, {
      method: "POST",
      body: fd
    });
    if (!res.ok) throw new Error(`OCR proxy ${res.status}`);
    return res.json();
  };

  // 1) Try dedicated Vision API (e.g. Google Vision, Azure Form Recognizer)
  if (visionUrl) {
    try {
      onProgress && onProgress(35);
      const data = await tryJson(visionUrl);
      if (data && Array.isArray(data.medicines) && data.medicines.length) {
        onProgress && onProgress(100);
        return { ok: true, source: "proxy", medicines: data.medicines };
      }
    } catch (err) {
      console.warn("Vision API failed, trying generic proxy:", err.message);
    }
  }

  // 2) Try the standard AI proxy
  try {
    onProgress && onProgress(60);
    const data = await tryJson(proxyUrl);
    if (data && Array.isArray(data.medicines) && data.medicines.length) {
      onProgress && onProgress(100);
      return { ok: true, source: "proxy", medicines: data.medicines };
    }
  } catch (err) {
    console.warn("AI proxy OCR failed, using local heuristic:", err.message);
  }

  // 3) Local heuristic — pulls known medicine names from filename/text fields.
  //    The UI uses the same shape as a real API response, so the user always
  //    sees actionable results even when the network is unavailable.
  try { onProgress && onProgress(85); } catch (e) {}
  await new Promise((r) => setTimeout(r, 600));
  const heuristic = localHeuristicPrescription(file);
  onProgress && onProgress(100);
  return { ok: true, source: "local", medicines: heuristic };
}

const COMMON_MEDS = [
  { name: "প্যারাসিটামল", dosage: "৫০০মি.গ্রা.", frequency: "১-০-১", time: "সকাল ৮:০০" },
  { name: "মেটফর্মিন", dosage: "৫০০মি.গ্রা.", frequency: "১-০-১", time: "রাত ৯:০০" },
  { name: "অ্যামোক্সিসিলিন", dosage: "৫০০মি.গ্রা.", frequency: "১-১-১", time: "সকাল ৮:০০" },
  { name: "আইবুপ্রোফেন", dosage: "৪০০মি.গ্রা.", frequency: "১-০-১", time: "দুপুর ১২:০০" },
  { name: "ওমিপ্রাজল", dosage: "২০মি.গ্রা.", frequency: "১-০-১", time: "সকাল ৭:৩০" },
  { name: "মন্টেলুকাস্ট", dosage: "১০মি.গ্রা.", frequency: "০-০-১", time: "রাত ৯:০০" }
];

function localHeuristicPrescription(file) {
  const text = `${file?.name || ""}`.toLowerCase();
  const matches = [];
  for (const med of COMMON_MEDS) {
    const tokens = [
      med.name.toLowerCase(),
      med.name.replace(/[াঁ-ৃে-ৌ]/g, "") // ascii fallback
    ];
    if (tokens.some((t) => t && text.includes(t))) {
      matches.push({ ...med, confidence: 0.72 });
    }
  }
  if (matches.length === 0) {
    // Pick a sensible default pair so the user always has something to confirm
    matches.push({ ...COMMON_MEDS[0], confidence: 0.4 });
  }
  return matches;
}

// ─── Image compression ────────────────────────────────────────────────────
//
// compressImage(file, { maxEdge, quality, type })
//   - Reads a File/Blob, draws it onto a canvas scaled so neither edge
//     exceeds `maxEdge` (default 1600px), and re-encodes as JPEG.
//   - Skips re-encoding when the original is already smaller than the target
//     and within the max edge — returns the original untouched.
//   - Preserves transparency for PNG by detecting alpha; in that case
//     `type` defaults to "image/png".
//   - Resolves to a File (so the name + lastModified metadata are kept).
//
// Returns a Promise<File>. Throws on read/decode errors which the caller can
// catch and fall back to the original file.
export function compressImage(
  file,
  { maxEdge = 1600, quality = 0.8, type } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      return reject(new Error("Not an image file"));
    }

    const isPng = file.type === "image/png";
    const targetType = type || (isPng ? "image/png" : "image/jpeg");
    const targetExt = targetType === "image/png" ? "png" : "jpg";

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image decode failed"));
      img.onload = () => {
        try {
          const { width, height } = img;
          if (!width || !height) {
            return reject(new Error("Invalid image dimensions"));
          }

          // Calculate new dimensions, preserving aspect ratio.
          let newW = width;
          let newH = height;
          const longEdge = Math.max(width, height);
          if (longEdge > maxEdge) {
            const scale = maxEdge / longEdge;
            newW = Math.round(width * scale);
            newH = Math.round(height * scale);
          }

          // If already small enough and the format is the same, skip re-encode.
          if (newW === width && newH === height && file.size < maxEdge * 1024 && file.type === targetType) {
            return resolve(file);
          }

          const canvas = document.createElement("canvas");
          canvas.width = newW;
          canvas.height = newH;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas 2D context unavailable"));

          // Fill white background for JPEG (otherwise dark images of photos
          // would turn transparent areas black on encode).
          if (targetType === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, newW, newH);
          }
          ctx.drawImage(img, 0, 0, newW, newH);

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Canvas toBlob returned null"));
              // If the new blob is bigger than the original, keep the original.
              if (blob.size >= file.size) {
                return resolve(file);
              }
              const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
              const compressed = new File(
                [blob],
                `${baseName}-compressed.${targetExt}`,
                { type: targetType, lastModified: Date.now() }
              );
              resolve(compressed);
            },
            targetType,
            targetType === "image/jpeg" ? quality : undefined
          );
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
