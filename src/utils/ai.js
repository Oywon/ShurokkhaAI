// Lightweight AI helpers — call external AI proxy if REACT_APP_AI_API_URL is set,
// otherwise fall back to a local heuristic stub. This file also supports
// direct client-side OpenAI calls when `REACT_APP_OPENAI_API_KEY` is present.

async function callOpenAIChat(prompt) {
  const key = process.env.REACT_APP_OPENAI_API_KEY;
  if (!key) return null;
  try {
    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a concise medical assistant. Provide short, clear, and safe first-aid style advice in Bengali when possible.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.2
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('OpenAI call failed', err);
    return null;
  }
}

export async function analyzeSymptomsAPI(text) {
  const url = process.env.REACT_APP_AI_API_URL;
  // 1) If user provided a proxy URL, prefer that
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
      console.error('AI analyze error', err);
    }
  }

  // 2) If an OpenAI key is set in env, call OpenAI directly (insecure client-side)
  if (process.env.REACT_APP_OPENAI_API_KEY) {
    const prompt = `User symptom report:\n${text}\n\nProvide a short, safe, primary-care style recommendation in Bengali when possible.`;
    const out = await callOpenAIChat(prompt);
    if (out) return out;
  }

  // 3) Local heuristic fallback (Bangla/English friendly)
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
  // If user provided a proxy URL, prefer that
  const url = process.env.REACT_APP_AI_API_URL;
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
      console.error('Transcription error', err);
    }
  }

  // If OpenAI key is present, call Whisper (note: client-side API key exposure!)
  const key = process.env.REACT_APP_OPENAI_API_KEY;
  if (key) {
    try {
      const fd = new FormData();
      fd.append('file', blob, 'recording.webm');
      fd.append('model', 'whisper-1');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`
        },
        body: fd
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Whisper error: ${res.status} ${txt}`);
      }
      const data = await res.json();
      return data.text || null;
    } catch (err) {
      console.error('Whisper transcription failed', err);
    }
  }

  return null;
}
