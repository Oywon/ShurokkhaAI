# OpenAI Proxy for Shurokkha AI

This small Express server forwards requests to OpenAI securely from a server-side environment.

Usage

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY=sk-...`.
2. Install dependencies and run:

```bash
cd server
npm install
npm run start
```

Endpoints

- `POST /analyze` — JSON body `{ text: string }`, returns `{ answer: string }`.
- `POST /transcribe` — multipart `file` upload (field name `file`), returns `{ text: string }`.

Security

Keep `OPENAI_API_KEY` secret and never commit `.env` to source control.
