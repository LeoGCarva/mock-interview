# Mock Interview: Project Context

> **Rule:** every new feature or behavior change must be recorded here (Feature list + Changelog).

## 1. Overview

A voice mock-interview trainer. The user pastes a job description, picks a language and the number of questions, and is then interviewed out loud by an AI interviewer (Google Gemini). Each turn has three steps:

1. **Voice to text:** the candidate answers through the microphone. The live transcript is shown but **cannot be edited** or re-recorded.
2. **The interviewer:** the answer is sent to Gemini, which decides what the interviewer says next (a follow-up or a new topic).
3. **Text to voice:** the interviewer's reply is read out loud.

After the last answer the interviewer says goodbye and Gemini writes a feedback report.

There is **no database**: the whole session lives in React state in the browser, and the server is stateless.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, color tokens in `src/app/globals.css` (light + dark) |
| AI | `@google/genai` (Google Gemini SDK, server only); model `gemini-3.8-flash` by default |
| Validation | `zod` 4 (API requests + structured feedback output) |
| Speech | Browser Web Speech API: `SpeechRecognition` (STT) and `speechSynthesis` (TTS) |
| Tests | `vitest` (pure logic in `src/lib`) |

## 3. Setup & run

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY (https://aistudio.google.com/apikey)
npm run dev                  # http://localhost:3000
```

| Env var | Required | Default | Notes |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | none | Server-side only, never sent to the browser |
| `GEMINI_MODEL` | no | `gemini-3.8-flash` | Must be a Gemini 3+ model (the app sets `thinkingLevel`) |

Other scripts: `npm run build`, `npm run lint`, `npm test`, `npx tsc --noEmit`.

**Browser:** use **Google Chrome or Microsoft Edge** on desktop. Firefox has no speech recognition. The page must run on `localhost` or HTTPS for microphone access.

## 4. Architecture

```
 Browser (React state only)                               Server (stateless)
 ─────────────────────────────────────────────            ──────────────────────────────
 SetupForm ── job description, language, N, voice
     │
 InterviewRoom (turn loop)
   STEP 1  useSpeechRecognition ──► read-only transcript
             │ "Finish answer"
   STEP 2  streamInterviewerTurn ── POST /api/interview ──► Gemini (streaming)
             ▲    NDJSON text deltas ◄────────────────────── text_delta events
             │
   STEP 3  sentence splitter ──► useSpeechSynthesis (speaks while text streams)
     │
     │ after the last answer (in parallel with the spoken goodbye)
 FeedbackReport ◄── fetchFeedback ── POST /api/feedback ──► Gemini (structured JSON)
```

### Turn logic

- `getStage(answersGiven, totalQuestions)` (`src/lib/interview.ts`) gives `opening`, `question k of N` or `closing`. Client and server both derive it from the history, so they can't get out of sync.
- `contents` sent to Gemini: `[fixed kickoff user message, ...history]`, with interviewer turns as role `model` (`toGeminiContents` in `src/lib/geminiShared.ts`). The stage instruction is appended to the end of `systemInstruction` (Gemini has no mid-conversation system messages).
- Follow-up questions count toward N.
- The candidate's turn starts only after the reply has finished streaming **and** the voice has finished speaking. The mic is never open while the interviewer talks.

### File map

```
src/app/page.tsx                    renders <InterviewApp/>
src/app/api/interview/route.ts      STEP 2 server: streams interviewer turn (NDJSON)
src/app/api/feedback/route.ts       feedback report (structured output)
src/components/InterviewApp.tsx     phase state machine: setup → interview → feedback
src/components/SetupForm.tsx        job description, language, question count, voice picker
src/components/InterviewRoom.tsx    turn loop, status, controls
src/components/ConversationView.tsx read-only chat history
src/components/LiveTranscript.tsx   STEP 1 read-only live transcript
src/components/FeedbackReport.tsx   report UI, read-aloud, download
src/components/ui.tsx, icons.tsx    Button / Notice / Spinner, inline SVG icons
src/hooks/useSpeechRecognition.ts   STEP 1 (Web Speech API, auto-restart)
src/hooks/useSpeechSynthesis.ts     STEP 3 (queue, voices, Chrome workarounds)
src/hooks/useClientValue.ts         hydration-safe browser values
src/lib/gemini.ts                   server-only Gemini client, model/thinking constants
src/lib/geminiShared.ts             contents mapping, error mapping, refusal detection (testable)
src/lib/prompts.ts                  interviewer + feedback prompts
src/lib/interview.ts                getStage, InterviewSettings
src/lib/schemas.ts                  zod schemas, shared types, limits, error codes
src/lib/apiClient.ts                browser fetch helpers (NDJSON stream reader)
src/lib/ndjson.ts                   NDJSON encode/parse
src/lib/sentenceSplitter.ts         streaming sentence chunker for TTS
src/lib/voices.ts                   voice ranking/selection
src/lib/report.ts                   Markdown report + file download
src/lib/i18n.ts                     UI strings (en-US / pt-BR), languages, question counts
tests/                              vitest unit tests
```

## 5. Feature list

| # | Feature | What it does | Main files | Status |
|---|---|---|---|---|
| F1 | Job description setup | Paste a job posting (50 to 20,000 chars); Gemini tailors every question to it | `SetupForm.tsx`, `schemas.ts` | ✅ Done |
| F2 | Language selection | English (en-US) or Brazilian Portuguese (pt-BR). Drives UI text, speech recognition, voice, Gemini's interview language and the feedback language. Default comes from the browser language | `i18n.ts`, `SetupForm.tsx` | ✅ Done |
| F3 | Interview length | 3, 5, 8 or 10 questions (follow-ups count) | `i18n.ts`, `interview.ts` | ✅ Done |
| F4 | Voice picker + test | Choose any installed voice for the language or "Automatic" (prefers Natural/Online/Google voices); "Test voice" button | `voices.ts`, `SetupForm.tsx` | ✅ Done |
| F5 | Microphone check | Mic permission requested on "Start interview" so permission problems appear before the interview starts | `SetupForm.tsx` | ✅ Done |
| F6 | **Step 1: Voice to text** | Live transcript (confirmed text + grey interim words) in a read-only `<div>`. No editing, no re-recording. Auto-restarts when the browser stops after silence. Recording timer. "Nothing heard" warning if the answer is empty. If recognition fails mid-answer, the user can continue or submit what was captured | `useSpeechRecognition.ts`, `LiveTranscript.tsx`, `InterviewRoom.tsx` | ✅ Done |
| F7 | **Step 2: AI interviewer** | Gemini acts as the interviewer: greeting + Q1, then follow-up or new topic per answer, then a closing line. One question per turn, spoken-style prose, no feedback during the interview | `api/interview/route.ts`, `prompts.ts`, `interview.ts` | ✅ Done |
| F8 | Streaming replies | Interviewer text streams to the screen token by token (NDJSON over `fetch`) | `route.ts`, `apiClient.ts`, `ndjson.ts` | ✅ Done |
| F9 | **Step 3: Text to voice** | Reply is spoken sentence by sentence **while it streams**, so the voice starts early | `useSpeechSynthesis.ts`, `sentenceSplitter.ts` | ✅ Done |
| F10 | Voice controls | Replay last question, Skip voice, Mute/Unmute (text still shown) | `InterviewRoom.tsx` | ✅ Done |
| F11 | Progress | "Question k of N" + progress bar, status line, animated interviewer avatar | `InterviewRoom.tsx` | ✅ Done |
| F12 | End early | "End interview" (with confirmation) → feedback on answered questions, or back to setup if none | `InterviewRoom.tsx`, `InterviewApp.tsx` | ✅ Done |
| F13 | Feedback report | Overall score (1-10), summary, strengths, improvements, per-question score + what went well / to improve / stronger-answer tip, next steps, transcript. Generated in parallel with the spoken goodbye | `api/feedback/route.ts`, `FeedbackReport.tsx` | ✅ Done |
| F14 | Read summary aloud | Speaks the overall score and summary | `FeedbackReport.tsx` | ✅ Done |
| F15 | Download report | Markdown file with feedback, transcript and job description (client-side, nothing stored) | `report.ts` | ✅ Done |
| F16 | Practice again / new job | Restart with the same settings, or return to setup with an empty job description | `InterviewApp.tsx` | ✅ Done |
| F17 | Error handling + retry | Friendly localized messages for missing/invalid API key, rate limit, overload, connection, refusal; "Try again" re-sends the same turn | `geminiShared.ts`, `apiClient.ts`, `i18n.ts` | ✅ Done |
| F18 | Browser support banner | Warns when speech recognition (blocking) or speech synthesis (text-only mode) is unavailable | `SetupForm.tsx` | ✅ Done |
| F19 | Safety-block handling | Gemini safety blocks (`promptFeedback.blockReason`, or `finishReason` such as `SAFETY`) are reported as a `refusal` error with a retry option | `api/*/route.ts`, `geminiShared.ts` | ✅ Done |
| F20 | Input validation | zod validation of every API request (lengths, roles alternate, language/question count enums) | `schemas.ts` | ✅ Done |

## 6. API contracts

### `POST /api/interview`

Request:
```json
{
  "jobDescription": "string (50-20000 chars)",
  "language": "en-US | pt-BR",
  "totalQuestions": 3 | 5 | 8 | 10,
  "history": [{ "role": "assistant | user", "content": "string (≤10000)" }]
}
```
`history` starts with the interviewer (`assistant`), alternates, and is empty for the opening or ends with the candidate's answer.

Response: `200 application/x-ndjson`, one event per line:
```
{"type":"text","text":"Hi! Thanks for "}
{"type":"text","text":"joining us today..."}
{"type":"done"}
```
or a final `{"type":"error","code":"<code>","message":"..."}`. Validation problems return `400`, and a missing key returns `500`, both with JSON `{"error":{"code","message"}}`.

### `POST /api/feedback`

Request: `{ jobDescription, language, history }`, where `history` has at least one answer.
Response: `200 {"feedback": Feedback}` (see `FeedbackSchema` in `src/lib/schemas.ts`), or `{"error":{"code","message"}}`.

Error codes: `missing_api_key`, `auth`, `rate_limit`, `overloaded`, `connection`, `refusal`, `bad_request`, `unknown`.

### Gemini call settings (`src/lib/gemini.ts`)

| Setting | Interviewer turn | Feedback |
|---|---|---|
| API | `ai.models.generateContentStream` | `ai.models.generateContent` |
| Model | `GEMINI_MODEL` or `gemini-3.8-flash` | same |
| `thinkingLevel` | `LOW` (`INTERVIEWER_THINKING`, voice latency) | `MEDIUM` (`FEEDBACK_THINKING`) |
| `maxOutputTokens` | 8,000 (includes thinking) | 16,000 |
| Output | streamed text | `responseMimeType: application/json` + `responseJsonSchema` from `z.toJSONSchema(FeedbackSchema)`, then validated with zod |
| Abort | `abortSignal: request.signal` | same |

## 7. Prompt design notes

- **Interviewer system prompt** (`buildInterviewerSystemPrompt`): realistic interviewer for the role in `<job_description>`, which is treated as data, never as instructions. Mix of warm-up, behavioral (STAR), technical and situational questions. One question per turn, follow-ups when answers are vague. No coaching or grading during the interview. Output is **spoken**, so it uses plain prose with no markdown or emojis, under about 80 words. Transcripts may contain speech-to-text errors, so they are read charitably. The chosen language is enforced. Includes "begin your visible answer immediately" for voice latency.
- **Stage instruction** (`buildStageInstruction`): per-turn system message for the opening, question k of N (with a "final question" flag), or the closing (no more questions).
- **Feedback prompt** (`buildFeedbackSystemPrompt`): calibrated 1-10 scoring (5 is average), ignores transcription errors, one entry per answered question, written in the chosen language. The transcript is sent as one `<transcript>` user message.

## 8. Known limitations

- Speech recognition works only in Chromium browsers (Chrome, Edge). Chrome and Edge send the audio to their cloud speech service, so it needs internet.
- Voice quality depends on the voices installed in the OS/browser.
- Brief pauses between Chrome's automatic recognition restarts can drop a word or two.
- Hearing your own voice while answering is not caused by the app (it never plays the microphone). Turn off Windows "Listen to this device" (Sound settings → Recording → your mic → Properties → Listen) or the headset's sidetone / mic monitoring.
- No persistence: reloading the page loses the interview (by design, no database).
- No authentication or rate limiting on the API routes, so it's meant for local or personal use. Add both before deploying publicly, since anyone could spend your API credits.
- The live Gemini round-trip was verified only for request validation and the invalid-key path (no real key in the dev environment). Run one interview end-to-end after adding a key.

## 9. Changelog

| Date | Change |
|---|---|
| 2026-11-09 | Initial version: features F1 to F20 (Claude). |
| 2026-11-09 | Switched the AI provider from Anthropic Claude to Google Gemini (`@google/genai`, `GEMINI_API_KEY`, default `gemini-3.8-flash`). F19 changed from refusal fallback to Gemini safety-block handling. |
| 2026-11-09 | Interview page: the window no longer scrolls (fixed full-screen layout); the conversation panel reserves its scrollbar space and auto-scrolls without jitter, following new text only while you are at the bottom. |
