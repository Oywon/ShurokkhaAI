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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gemini proxy listening on port ${PORT}`));
