import { createNdjsonParser } from "./ndjson";
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type Feedback,
  type FeedbackRequest,
  type InterviewRequest,
} from "./schemas";

export class InterviewApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "InterviewApiError";
  }
}

function toCode(value: unknown): ApiErrorCode {
  return API_ERROR_CODES.includes(value as ApiErrorCode) ? (value as ApiErrorCode) : "unknown";
}

async function readError(response: Response): Promise<InterviewApiError> {
  try {
    const data = (await response.json()) as { error?: { code?: unknown; message?: unknown } };
    return new InterviewApiError(
      toCode(data.error?.code),
      typeof data.error?.message === "string" ? data.error.message : `HTTP ${response.status}`,
    );
  } catch {
    return new InterviewApiError("unknown", `HTTP ${response.status}`);
  }
}

/**
 * STEP 2 (client side): asks the server for the interviewer's next turn and
 * calls `onText` for every streamed text delta. Resolves with the full reply.
 */
export async function streamInterviewerTurn(
  body: InterviewRequest,
  onText: (delta: string) => void,
  signal: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new InterviewApiError("connection", "Could not reach the server.");
  }
  if (!response.ok || !response.body) throw await readError(response);

  const state = { text: "", finished: false, failure: null as InterviewApiError | null };
  const parser = createNdjsonParser((event) => {
    if (event.type === "text") {
      state.text += event.text;
      onText(event.text);
    } else if (event.type === "done") {
      state.finished = true;
    } else if (event.type === "error") {
      state.failure = new InterviewApiError(toCode(event.code), event.message);
    }
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(value);
    }
    parser.flush();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new InterviewApiError("connection", "The connection was interrupted.");
  }

  if (state.failure) throw state.failure;
  if (!state.finished) throw new InterviewApiError("connection", "The response ended unexpectedly.");
  const text = state.text.trim();
  if (!text) throw new InterviewApiError("unknown", "The interviewer returned an empty reply.");
  return text;
}

export async function fetchFeedback(body: FeedbackRequest, signal?: AbortSignal): Promise<Feedback> {
  let response: Response;
  try {
    response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new InterviewApiError("connection", "Could not reach the server.");
  }
  if (!response.ok) throw await readError(response);
  const data = (await response.json()) as { feedback: Feedback };
  return data.feedback;
}
