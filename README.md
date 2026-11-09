# Mock Interview

Practice job interviews out loud with an AI interviewer powered by Google Gemini.

1. **You speak:** answer with your microphone (live, read-only transcript).
2. **The interviewer thinks:** Gemini decides the next question based on your answer.
3. **The interviewer speaks:** the reply is read out loud.

At the end you get a scored feedback report.

## Quick start

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY (get one at https://aistudio.google.com/apikey)
npm run dev
```

Open http://localhost:3000 in **Chrome or Edge**.

See [CONTEXT.md](./CONTEXT.md) for the architecture, the full feature list, API contracts and known limitations.
