import { ApiError, type Content } from "@google/genai";
import type { ChatTurn, ApiErrorCode } from "./schemas";

/**
 * Builds Gemini `contents`: a fixed kickoff user message, then the interview
 * history (interviewer = "model", candidate = "user").
 */
export function toGeminiContents(kickoff: string, history: readonly ChatTurn[]): Content[] {
  return [
    { role: "user", parts: [{ text: kickoff }] },
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
  ];
}

export interface MappedError {
  status: number;
  code: ApiErrorCode;
  message: string;
}

/** Maps Gemini SDK / network errors to the app's error codes. */
export function mapGeminiError(error: unknown): MappedError {
  if (error instanceof ApiError) {
    const { status, message } = error;
    if (status === 401 || status === 403 || /API[_ ]key/i.test(message)) {
      return { status: 500, code: "auth", message };
    }
    if (status === 429) return { status: 429, code: "rate_limit", message };
    if (status === 503 || status === 504) return { status: 503, code: "overloaded", message };
    if (status >= 400 && status < 500) return { status: 400, code: "bad_request", message };
    return { status: 502, code: "unknown", message };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof TypeError || /fetch failed|ECONN|ENOTFOUND|ETIMEDOUT/i.test(message)) {
    return { status: 503, code: "connection", message };
  }
  return { status: 500, code: "unknown", message };
}

/** Finish/block reasons that mean the model refused for safety or policy reasons. */
const REFUSAL_REASONS = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "RECITATION",
  "IMAGE_SAFETY",
]);

export function isRefusal(finishReason?: string | null, blockReason?: string | null): boolean {
  return Boolean(blockReason) || (finishReason != null && REFUSAL_REASONS.has(finishReason));
}
