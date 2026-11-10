# Mock Interview

Practice job interviews **speaking out loud** with an AI interviewer (Google Gemini).

You paste a job description and the interviewer asks questions tailored to it. You answer through the microphone and it reacts to what you said, with a follow-up or a new topic. At the end, you get a report with a score and tips for improvement.

Each round has three steps:

1. **You speak:** your answer is transcribed live. As in a real interview, the transcript can't be edited or re-recorded.
2. **The interviewer thinks:** Gemini reads your answer and decides the next question.
3. **The interviewer speaks:** its reply is read aloud while it's still being generated.

Nothing is saved: there's no database and no login. The interview exists only in the browser tab.

## Requirements

- **Node.js** 20 or later
- A **Google Gemini API key**, free at https://aistudio.google.com/apikey
- **Google Chrome or Microsoft Edge** on a computer. Firefox doesn't have speech recognition.
- A microphone and an internet connection. Chrome and Edge transcribe speech in the cloud.

## Installation

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and paste your key:

```env
GEMINI_API_KEY=your-key-here

# Optional: another Gemini 3 or later model (default: gemini-3.8-flash)
# GEMINI_MODEL=gemini-3.8-flash
```

The key stays on the server only and is never sent to the browser. `.env.local` is already in `.gitignore`.

## How to run

```bash
npm run dev
```

Open http://localhost:3000 in Chrome or Edge. The microphone only works on `localhost` or over HTTPS.

## How to use

### 1. Set up the interview

| Field | What to do |
|---|---|
| **Job description** | Paste the job posting: role, company, responsibilities, and requirements (50 to 20,000 characters). The more detail, the more specific the questions. |
| **Interview language** | Português (Brasil) or English (US). The language applies to the screen, the transcript, the voice, the questions, and the feedback. |
| **Number of questions** | 3, 5, 8, or 10. Follow-up questions also count. |
| **Interviewer voice** | Leave it on "Automatic" or choose an installed voice. Use **Test voice** to hear how it sounds. |

Click **Start interview**. The first time, the browser asks for permission to use the microphone.

### 2. Answer the questions

1. The interviewer introduces itself and asks the first question out loud.
2. When it finishes speaking, click **Start answering** and speak normally.
3. Click **Finish answer** when you're done. The interviewer then asks the next question.

The microphone is never open while the interviewer is speaking. During the interview you can use these buttons:

| Button | What it does |
|---|---|
| **Replay** | Hear the interviewer's last line again |
| **Skip voice** | Stops the current speech. The text stays on screen. |
| **Mute / Unmute** | Turns the interviewer's voice off or on |
| **End interview** | Ends before the finish and generates feedback only on the questions already answered |

If the recording stops on its own in the middle of your answer, you can click **Continue answering** or **Submit answer** to send what was already captured. If the AI returns an error, **Try again** resends the same round.

### 3. Read the feedback

After the last answer, the interviewer says goodbye and the report appears with:

- **overall score** from 1 to 10 (5 is average), summary, strengths, and what to improve;
- **question by question**: score, what went well, what to improve, and how to make the answer stronger;
- **next steps** and the full **transcript**.

Report options:

- **Read summary aloud**
- **Download report (.md)**: Markdown file with the feedback, transcript, and job description
- **Practice again (same job)**
- **New job description**

## Tips and common problems

| Problem | Solution |
|---|---|
| "The server has no Google Gemini API key" | Fill in `GEMINI_API_KEY` in `.env.local` and restart `npm run dev`. |
| "The Gemini API key was rejected" | Check that the key was copied in full, with no spaces. |
| Microphone blocked | Click the lock icon in the address bar, allow the microphone, and reload the page. |
| "We didn't catch anything" | Check that the right microphone is selected in the system and in the browser. |
| You hear your own voice while speaking | This doesn't come from the app. On Windows, turn off "Listen to this device" (Sound settings → Recording → your microphone → Properties → Listen) or your headset's microphone monitoring. |
| The voice sounds robotic | The quality depends on the installed voices. In Edge, the "Natural/Online" voices usually sound better. |
| I reloaded the page and lost everything | This is the expected behavior, because nothing is saved. Download the report before leaving. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Runs the production build |
| `npm test` | Unit tests (vitest) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type checking |

## Technologies

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Google Gemini (`@google/genai`), zod, and the browser's Web Speech API for transcription and voice.

## Warning before publishing

The API routes have no authentication or request limits. The project was made for local or personal use: if it's published as is, anyone can spend your Gemini credits.

Architecture, API contracts, prompt details, and the full feature list are in [CONTEXT.md](./CONTEXT.md).
