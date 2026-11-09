import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { ApiErrorBody, ApiErrorCode } from "./schemas";

/** Override with GEMINI_MODEL in .env.local. */
export const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

/** Thinking depth for interviewer turns (low keeps voice latency down). */
export const INTERVIEWER_THINKING = ThinkingLevel.LOW;
/** Thinking depth for the feedback report. */
export const FEEDBACK_THINKING = ThinkingLevel.MEDIUM;

/** Thinking tokens count toward the output limit, so leave headroom. */
export const INTERVIEWER_MAX_OUTPUT_TOKENS = 8_000;
export const FEEDBACK_MAX_OUTPUT_TOKENS = 16_000;

let client: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function hasCredentials(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export const MISSING_KEY_MESSAGE =
  "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.";

export function jsonError(status: number, code: ApiErrorCode, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}
