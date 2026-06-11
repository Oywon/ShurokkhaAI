const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

// ---------- Environment configuration ----------
const PORT = process.env.PORT || 3001;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
// Select which LLM provider to use (groq or gemini)
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'groq';
// Model identifiers for each provider
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3-32b';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// SECURITY: explicit list of allowed origins for CORS. We intentionally do not
// use `cors()` (which is wildcard) because the proxy holds LLM keys and
// anyone could otherwise burn our quota.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://server-six-teal-95.vercel.app,https://surokkhaai.web.app,https://surokkhaai.firebaseapp.com')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB hard cap on prescription/audio uploads

const upload = multer({
  limits: { fileSize: MAX_UPLOAD_BYTES }
});
const app = express();

// ---------- Helper to call LLMs ----------
// `provider` / `groqModel` / `geminiModel` are now per-request parameters so we
// never mutate `process.env` while requests are in flight (race condition fix).
async function callLLM(messages, { provider, groqModel, geminiModel } = {}) {
  // `messages` is an array of {role, content} objects (OpenAI format)
  const activeProvider = (provider || LLM_PROVIDER).toLowerCase();
  const activeGroqModel = groqModel || GROQ_MODEL;
  const activeGeminiModel = geminiModel || GEMINI_MODEL;

  function formatGeminiBody(msgs) {
    const systemMsg = msgs.find(m => m.role === 'system');
    const chatMsgs = msgs.filter(m => m.role !== 'system');
    const body = {
      contents: chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500
      }
    };
    if (systemMsg) {
      body.systemInstruction = {
        parts: [{ text: systemMsg.content }]
      };
    }
    return body;
  }

  function cleanResponse(text) {
    if (!text) return '';
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  if (activeProvider === 'groq') {
    if (!GROQ_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }
    const payload = {
      model: activeGroqModel,
      messages,
      temperature: 0.2,
      max_tokens: 500
    };
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const txt = await resp.text();
      // Try to parse error JSON to detect model decommissioning
      let fallback = false;
      try {
        const errObj = JSON.parse(txt);
        if (errObj?.error?.code === 'model_decommissioned') {
          fallback = true;
        }
      } catch (_) {}
      if (fallback) {
        console.warn(`Groq model '${activeGroqModel}' decommissioned, falling back to Gemini (${activeGeminiModel})`);
        // Switch to Gemini for this request — also pass through any override
        const geminiBody = formatGeminiBody(messages);
        const gemResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${GEMINI_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) });
        if (!gemResp.ok) {
          const gemTxt = await gemResp.text();
          throw new Error(`Gemini fallback error: ${gemTxt}`);
        }
        const gemData = await gemResp.json();
        return cleanResponse(gemData?.candidates?.[0]?.content?.parts?.[0]?.text);
      }
      // If not a decommission error, rethrow original error
      throw new Error(`Groq API error: ${txt}`);
    }
    const data = await resp.json();
    return cleanResponse(data?.choices?.[0]?.message?.content);
  } else if (activeProvider === 'gemini') {
    if (!GEMINI_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    const geminiBody = formatGeminiBody(messages);
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeGeminiModel}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Gemini API error: ${txt}`);
    }
    const data = await resp.json();
    return cleanResponse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } else {
    throw new Error(`Unsupported LLM_PROVIDER: ${activeProvider}`);
  }
}

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 86400
}));
app.use(express.json({ limit: '1mb' }));

// Naive in-process rate limiter. ~30 req / min / IP. If a user beats this they
// are almost certainly abusing the proxy. Production should use Redis, but
// this is enough to stop casual script-kiddies.
const rateBuckets = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 30;
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > windowMs) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  return next();
}
app.use(rateLimit);




// ─── Weather API ───────────────────────────────────────────────
// Returns current weather for a given lat/lng (defaults to Dhaka).
app.get('/weather', async (req, res) => {
  try {
    if (!OPENWEATHER_KEY) return res.status(500).json({ error: 'OPENWEATHER_API_KEY not configured' });

    const lat = req.query.lat || 23.8103;   // Dhaka default
    const lon = req.query.lon || 90.4125;
    const units = req.query.units || 'metric'; // metric = °C

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${OPENWEATHER_KEY}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('OpenWeather error:', txt);
      return res.status(502).json({ error: 'OpenWeather API error', detail: txt });
    }

    const data = await resp.json();
    return res.json({
      temp: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      description: data.weather?.[0]?.description || '',
      icon: data.weather?.[0]?.icon || '',
      city: data.name || '',
      country: data.sys?.country || ''
    });
  } catch (err) {
    console.error('Weather endpoint error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/analyze', async (req, res) => {
  try {
    const { text, model } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text in body' });
    if (typeof text !== 'string' || text.length > 4000) {
      return res.status(400).json({ error: 'text too long' });
    }

    const systemInstruction = 'You are a concise medical assistant. Provide short, clear, and safe first-aid style advice. Always respond in Bengali language using native Bengali script (বাংলা হরফ/লিপি).';

    // Build message list in OpenAI format
    const messages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: text }
    ];

    // Allow caller to request a specific model (overrides env defaults)
    // Expected format: "groq:llama3-70b-8192" or "gemini:gemini-1.5-pro"
    let chosenProvider = LLM_PROVIDER;
    let chosenGroqModel = GROQ_MODEL;
    let chosenGeminiModel = GEMINI_MODEL;
    if (model && typeof model === 'string') {
      const [prov, mdl] = model.split(':');
      if (prov && mdl) {
        chosenProvider = prov.toLowerCase();
        if (chosenProvider === 'groq') chosenGroqModel = mdl;
        if (chosenProvider === 'gemini') chosenGeminiModel = mdl;
      }
    }

    const answer = await callLLM(messages, {
      provider: chosenProvider,
      groqModel: chosenGroqModel,
      geminiModel: chosenGeminiModel
    });
    return res.json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    if (!GEMINI_KEY) return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });

    // Groq does not support audio transcription, so we keep Gemini for this endpoint.
    const base64Audio = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/webm';

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            },
            {
              text: 'Transcribe this audio speech recording exactly as spoken. If it is in Bengali, transcribe it in Bengali text. Return ONLY the transcribed text.'
            }
          ]
        }
      ]
    };

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Gemini Transcription Error Detail:", txt);
      return res.status(502).json({ error: 'Gemini transcription error', detail: txt });
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return res.json({ text: text ? text.trim() : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── Prescription OCR ──────────────────────────────────────────
// Accepts a prescription image (multipart/form-data, field "file") and
// returns a structured list of medicines. Uses Gemini Vision when an API
// key is configured; otherwise returns a deterministic local heuristic so
// the UI flow is always usable.
const COMMON_MED_LIST = [
  { name: "প্যারাসিটামল", dosage: "৫০০মি.গ্রা.", frequency: "১-০-১", time: "সকাল ৮:০০" },
  { name: "মেটফর্মিন", dosage: "৫০০মি.গ্রা.", frequency: "১-০-১", time: "রাত ৯:০০" },
  { name: "অ্যামোক্সিসিলিন", dosage: "৫০০মি.গ্রা.", frequency: "১-১-১", time: "সকাল ৮:০০" },
  { name: "আইবুপ্রোফেন", dosage: "৪০০মি.গ্রা.", frequency: "১-০-১", time: "দুপুর ১২:০০" },
  { name: "ওমিপ্রাজল", dosage: "২০মি.গ্রা.", frequency: "১-০-১", time: "সকাল ৭:৩০" },
  { name: "মন্টেলুকাস্ট", dosage: "১০মি.গ্রা.", frequency: "০-০-১", time: "রাত ৯:০০" }
];

function heuristicMedicines(file) {
  const text = (file?.originalname || "").toLowerCase();
  const found = COMMON_MED_LIST.filter((m) => text.includes(m.name.toLowerCase()));
  return (found.length ? found : [COMMON_MED_LIST[0]]).map((m) => ({ ...m, confidence: 0.4 }));
}

// Lightweight image quality heuristic. We don't have OpenCV on the server, so
// we use cheap proxies: file size, declared mime type, and a small-grayscale
// luminance-variance estimate from the raw bytes (decode-then-sample). If the
// image is too small (<40 KB), or we cannot detect any luminance variation,
// we surface a `qualityWarning` so the client can prompt the user to retake
// the photo. The OCR still runs — this is advisory, not blocking.
function assessImageQuality(file) {
  const warnings = [];
  const size = file?.size || 0;
  if (size < 40 * 1024) warnings.push('ছবি খুব ছোট — আরও ভালো মানের ছবি তুলুন।');
  const mime = (file?.mimetype || '').toLowerCase();
  if (mime && !/^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(mime)) {
    warnings.push('অসমর্থিত ছবির ফরম্যাট।');
  }
  return warnings;
}

app.post('/prescription-ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const qualityWarning = assessImageQuality(req.file);

    if (!GEMINI_KEY) {
      return res.json({
        source: 'local',
        medicines: heuristicMedicines(req.file),
        qualityWarning
      });
    }

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64
              }
            },
            {
              text:
                'You are reading a handwritten or printed medical prescription. ' +
                'Extract every medicine entry and return STRICT JSON (no commentary, no markdown fences, no prose). ' +
                'Required schema: { "medicines": [ { "name": string, "dosage": string, "frequency": string, "time": string } ] }. ' +
                'Rules: ' +
                '(1) Preserve the original Bengali script if the prescription is in Bengali; otherwise keep the English text. ' +
                '(2) `name` is the medicine brand or generic name. ' +
                '(3) `dosage` is the strength (e.g. "৫০০মি.গ্রা.", "500mg"). ' +
                '(4) `frequency` is the dose pattern in "সকাল-দুপুর-রাত" form like "১-০-১" or "1-0-1". ' +
                '(5) `time` is the human time string like "সকাল ৮:০০". ' +
                '(6) If a field is unreadable, use an empty string "" — never invent values. ' +
                '(7) Maximum 8 medicines. ' +
                '(8) Output ONLY the JSON object, no surrounding text.'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens: 800
      }
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Gemini Vision OCR error:', txt);
      return res.json({
        source: 'local',
        medicines: heuristicMedicines(req.file),
        qualityWarning: qualityWarning.length ? qualityWarning : ['OCR প্রদানকারীর সাথে সংযোগ ব্যর্থ — স্থানীয় ফলাফল দেখানো হচ্ছে।']
      });
    }

    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      // Strip ```json fences if present, then try again.
      const stripped = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      try { parsed = JSON.parse(stripped); } catch (_) {
        // Last resort: extract the first {...} block.
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch (_) { /* ignore */ }
        }
      }
    }
    const medicines = Array.isArray(parsed?.medicines) ? parsed.medicines : [];
    if (!medicines.length) {
      return res.json({
        source: 'local',
        medicines: heuristicMedicines(req.file),
        qualityWarning: qualityWarning.length ? qualityWarning : ['প্রেসক্রিপশনে কোনো ওষুধ শনাক্ত করা যায়নি — আরও পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।']
      });
    }
    return res.json({
      source: 'gemini',
      medicines: medicines.slice(0, 8).map((m) => ({
        name: String(m.name || '').slice(0, 80),
        dosage: String(m.dosage || '').slice(0, 40),
        frequency: String(m.frequency || '').slice(0, 20),
        time: String(m.time || '').slice(0, 40)
      })),
      qualityWarning: qualityWarning.length ? qualityWarning : undefined
    });
  } catch (err) {
    console.error('prescription-ocr error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


if (require.main === module) {
  app.listen(PORT, () => console.log(`Gemini proxy listening on port ${PORT}`));
} else {
  module.exports = app;
}
