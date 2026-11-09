# Mock Interview

Practice job interviews **out loud** with an AI interviewer powered by Google Gemini.

Paste a job description and the interviewer asks questions tailored to it. You answer through your microphone, and the interviewer reacts to what you said with a follow-up or a new topic. At the end, you get a report with a score and tips for improving.

Each round has three steps:

1. **You speak:** your answer is transcribed live. As in a real interview, you can't edit or re-record it.
2. **The interviewer thinks:** Gemini reads your answer and decides what to ask next.
3. **The interviewer speaks:** the reply is read aloud while it's still being generated.

Nothing is saved. There's no database or login, and the interview exists only in your browser tab.

## Requirements

- **Node.js** 20 or later
- A **Google Gemini API key**, free at <https://aistudio.google.com/apikey>
- **Google Chrome or Microsoft Edge** on desktop. Firefox doesn't support speech recognition.
- A microphone and an internet connection, because Chrome and Edge transcribe speech in the cloud

## Installation

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and paste your key:

```env
GEMINI_API_KEY=your-key-here

# Optional: another Gemini 3+ model (default: gemini-3.8-flash)
# GEMINI_MODEL=gemini-3.8-flash
```

The key stays on the server and is never sent to the browser. `.env.local` is already in `.gitignore`.

## Running the app

```bash
npm run dev
```

Open <http://localhost:3000> in Chrome or Edge. The microphone only works on `localhost` or over HTTPS.

## How to use it

### 1. Set up the interview

| Field | What to do |
|---|---|
| **Job description** | Paste the job posting: role, company, responsibilities, and requirements (50 to 20,000 characters). More detail gives more specific questions. |
| **Interview language** | Brazilian Portuguese or US English. The choice applies to the interface, transcription, voice, questions, and feedback. |
| **Number of questions** | 3, 5, 8, or 10. Follow-up questions count toward the total. |
| **Interviewer voice** | Leave it on "Automatic" or pick an installed voice. Use **Test voice** to hear it. |

Click **Start interview**. The first time, your browser asks for microphone permission.

### 2. Answer the questions

1. The interviewer introduces themselves and asks the first question out loud.
2. When they finish speaking, click **Start answering** and speak normally.
3. Click **Finish answer** when you're done. The interviewer then asks the next question.

The microphone is never on while the interviewer is speaking. During the interview, you can use these controls:

| Control | What it does |
|---|---|
| **Replay** | Plays the interviewer's last line again |
| **Skip voice** | Stops the current speech. The text stays on screen. |
| **Mute / Unmute** | Turns the interviewer's voice off or on |
| **End interview** | Ends early and gives feedback only on the questions you answered |

If recording stops on its own mid-answer, you can click **Continue answering** or **Submit answer** to send what was captured. If the AI returns an error, **Try again** resends the same round.

### 3. Read the feedback

After your last answer, the interviewer says goodbye and the report appears with:

- An **overall score** from 1 to 10 (5 is average), a summary, strengths, and areas to improve
- **Question-by-question feedback:** score, what went well, what to improve, and how to make the answer stronger
- **Next steps** and the full **transcript**

From the report, you can:

- **Read the summary aloud**
- **Download the report (.md)**, a Markdown file with the feedback, transcript, and job description
- **Practice again** with the same job
- **Start over** with a new job description

## Troubleshooting

| Problem | Solution |
|---|---|
| "The server doesn't have an API key" | Set `GEMINI_API_KEY` in `.env.local` and restart `npm run dev`. |
| "The Gemini API key was rejected" | Check that you copied the whole key, with no spaces. |
| Microphone blocked | Click the lock icon in the address bar, allow the microphone, and reload the page. |
| "We didn't hear anything" | Check that the right microphone is selected in your system and browser settings. |
| You hear your own voice while speaking | This doesn't come from the app. On Windows, turn off "Listen to this device" (Sound settings → Recording → your microphone → Properties → Listen) or your headset's mic monitoring. |
| The voice sounds robotic | Quality depends on the voices installed. In Edge, the "Natural/Online" voices usually sound better. |
| I reloaded the page and lost everything | This is expected, because nothing is saved. Download the report before leaving. |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server at <http://localhost:3000> |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm test` | Run the unit tests (Vitest) |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Check types |

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Google Gemini (`@google/genai`), Zod, and the browser's Web Speech API for transcription and voice.

## Before you deploy

The API routes have no authentication or rate limiting. The project is meant for local or personal use. If you deploy it as is, anyone could use up your Gemini credits.

[CONTEXT.md](./CONTEXT.md) covers the architecture, API contracts, prompt details, and the full feature list.
