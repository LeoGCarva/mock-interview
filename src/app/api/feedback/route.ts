import { z } from "zod";
import {
  FEEDBACK_MAX_OUTPUT_TOKENS,
  FEEDBACK_THINKING,
  MISSING_KEY_MESSAGE,
  MODEL,
  getClient,
  hasCredentials,
  jsonError,
} from "@/lib/gemini";
import { isRefusal, mapGeminiError } from "@/lib/geminiShared";
import { buildFeedbackSystemPrompt, buildTranscriptMessage } from "@/lib/prompts";
import { FeedbackRequestSchema, FeedbackSchema } from "@/lib/schemas";

// Gemini's responseJsonSchema takes plain JSON Schema; drop the "$schema" meta key.
const FEEDBACK_JSON_SCHEMA: Record<string, unknown> = { ...z.toJSONSchema(FeedbackSchema) };
delete FEEDBACK_JSON_SCHEMA.$schema;

/**
 * Final step: Gemini evaluates the whole transcript and returns a structured
 * feedback report (JSON, validated against FeedbackSchema).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "Request body must be JSON.");
  }

  const parsed = FeedbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "bad_request", z.prettifyError(parsed.error));
  }
  if (!hasCredentials()) {
    return jsonError(500, "missing_api_key", MISSING_KEY_MESSAGE);
  }

  const { jobDescription, language, history } = parsed.data;

  try {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: buildTranscriptMessage(history) }] }],
      config: {
        systemInstruction: buildFeedbackSystemPrompt(jobDescription, language),
        maxOutputTokens: FEEDBACK_MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingLevel: FEEDBACK_THINKING },
        responseMimeType: "application/json",
        responseJsonSchema: FEEDBACK_JSON_SCHEMA,
        abortSignal: request.signal,
      },
    });

    if (isRefusal(response.candidates?.[0]?.finishReason, response.promptFeedback?.blockReason)) {
      return jsonError(422, "refusal", "The model declined to evaluate this interview.");
    }

    let data: unknown;
    try {
      data = JSON.parse(response.text ?? "");
    } catch {
      return jsonError(502, "unknown", "The feedback report was not valid JSON.");
    }
    const feedback = FeedbackSchema.safeParse(data);
    if (!feedback.success) {
      console.error("[api/feedback] schema mismatch", z.prettifyError(feedback.error));
      return jsonError(502, "unknown", "The feedback report did not match the expected format.");
    }
    return Response.json({ feedback: feedback.data });
  } catch (error) {
    const mapped = mapGeminiError(error);
    console.error("[api/feedback]", mapped.code, mapped.message);
    return jsonError(mapped.status, mapped.code, mapped.message);
  }
}
