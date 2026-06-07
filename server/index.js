const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const upload = multer();
const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. Proxy will return errors until configured.');
}

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
if (!OPENWEATHER_KEY) {
  console.warn('Warning: OPENWEATHER_API_KEY is not set. /weather endpoint will return errors until configured.');
}

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
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text in body' });

    if (!GEMINI_KEY) return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });

    const systemInstruction = 'You are a concise medical assistant. Provide short, clear, and safe first-aid style advice in Bengali when possible.';
    
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\nUser symptom report:\n${text}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500
      }
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
      console.error("Gemini API Error Detail:", txt);
      return res.status(502).json({ error: 'Gemini API error', detail: txt });
    }

    const data = await resp.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
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

app.post('/prescription-ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    if (!GEMINI_KEY) {
      return res.json({
        source: 'local',
        medicines: heuristicMedicines(req.file)
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
                'Extract every medicine entry and return STRICT JSON (no commentary, no markdown fences). ' +
                'Schema: { "medicines": [ { "name": string, "dosage": string, "frequency": string, "time": string } ] }. ' +
                'Preserve Bengali text where it appears. If a field is missing, use an empty string. ' +
                'Limit to at most 8 medicines.'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
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
        medicines: heuristicMedicines(req.file)
      });
    }

    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      // Attempt to extract JSON object from a fenced/mixed response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch (_) { /* ignore */ }
      }
    }
    const medicines = Array.isArray(parsed?.medicines) ? parsed.medicines : [];
    if (!medicines.length) {
      return res.json({ source: 'local', medicines: heuristicMedicines(req.file) });
    }
    return res.json({
      source: 'gemini',
      medicines: medicines.slice(0, 8).map((m) => ({
        name: m.name || '',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        time: m.time || ''
      }))
    });
  } catch (err) {
    console.error('prescription-ocr error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gemini proxy listening on port ${PORT}`));
