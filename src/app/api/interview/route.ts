import { z } from "zod";
import {
  INTERVIEWER_MAX_OUTPUT_TOKENS,
  INTERVIEWER_THINKING,
  MISSING_KEY_MESSAGE,
  MODEL,
  getClient,
  hasCredentials,
  jsonError,
} from "@/lib/gemini";
import { isRefusal, mapGeminiError, toGeminiContents } from "@/lib/geminiShared";
import { KICKOFF_MESSAGE } from "@/lib/i18n";
import { getStage } from "@/lib/interview";
import { encodeEvent, type StreamEvent } from "@/lib/ndjson";
import { buildInterviewerSystemPrompt, buildStageInstruction } from "@/lib/prompts";
import { InterviewRequestSchema, countAnswers } from "@/lib/schemas";

/**
 * STEP 2 (the interviewer). Receives the job description and the conversation
 * so far, asks Gemini for the interviewer's next turn, and streams the text
 * back as NDJSON events: {"type":"text"} …, then {"type":"done"} or {"type":"error"}.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "Request body must be JSON.");
  }

  const parsed = InterviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "bad_request", z.prettifyError(parsed.error));
  }
  if (!hasCredentials()) {
    return jsonError(500, "missing_api_key", MISSING_KEY_MESSAGE);
  }

  const { jobDescription, language, totalQuestions, history } = parsed.data;
  const stage = getStage(countAnswers(history), totalQuestions);

  // Gemini has no mid-conversation system messages, so the per-turn guidance
  // is appended to the system instruction.
  const systemInstruction = `${buildInterviewerSystemPrompt({
    jobDescription,
    language,
    totalQuestions,
  })}\n\nCurrent turn: ${buildStageInstruction(stage)}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The client has gone away; nothing left to deliver.
        }
      };

      try {
        const response = await getClient().models.generateContentStream({
          model: MODEL,
          contents: toGeminiContents(KICKOFF_MESSAGE[language], history),
          config: {
            systemInstruction,
            maxOutputTokens: INTERVIEWER_MAX_OUTPUT_TOKENS,
            thinkingConfig: { thinkingLevel: INTERVIEWER_THINKING },
            abortSignal: request.signal,
          },
        });

        let refused = false;
        for await (const chunk of response) {
          const text = chunk.text;
          if (text) send({ type: "text", text });
          if (isRefusal(chunk.candidates?.[0]?.finishReason, chunk.promptFeedback?.blockReason)) {
            refused = true;
          }
        }

        if (refused) {
          send({
            type: "error",
            code: "refusal",
            message: "The model declined to continue this conversation.",
          });
        } else {
          send({ type: "done" });
        }
      } catch (error) {
        if (!request.signal.aborted) {
          const mapped = mapGeminiError(error);
          console.error("[api/interview]", mapped.code, mapped.message);
          send({ type: "error", code: mapped.code, message: mapped.message });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed or cancelled.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
