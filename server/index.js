const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const upload = multer();
const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. Proxy will return errors until configured.');
}

app.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text in body' });

    if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });

    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a concise medical assistant. Provide short, clear, and safe first-aid style advice in Bengali when possible.' },
        { role: 'user', content: `User symptom report:\n${text}` }
      ],
      max_tokens: 500,
      temperature: 0.2
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'OpenAI error', detail: txt });
    }
    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content || null;
    return res.json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    form.append('model', 'whisper-1');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: form
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'OpenAI transcription error', detail: txt });
    }
    const data = await resp.json();
    return res.json({ text: data.text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`OpenAI proxy listening on port ${PORT}`));
