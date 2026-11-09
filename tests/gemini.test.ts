import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { isRefusal, mapGeminiError, toGeminiContents } from "../src/lib/geminiShared";

describe("toGeminiContents", () => {
  it("starts with the kickoff and maps interviewer turns to the model role", () => {
    expect(
      toGeminiContents("Hi, I'm ready.", [
        { role: "assistant", content: "Tell me about yourself." },
        { role: "user", content: "I build APIs." },
      ]),
    ).toEqual([
      { role: "user", parts: [{ text: "Hi, I'm ready." }] },
      { role: "model", parts: [{ text: "Tell me about yourself." }] },
      { role: "user", parts: [{ text: "I build APIs." }] },
    ]);
  });
});

describe("mapGeminiError", () => {
  const apiError = (status: number, message: string) => new ApiError({ status, message });

  it("maps invalid keys to auth", () => {
    expect(mapGeminiError(apiError(400, "API key not valid. Please pass a valid API key.")).code).toBe("auth");
    expect(mapGeminiError(apiError(403, "Permission denied")).code).toBe("auth");
  });

  it("maps rate limits, overload and other client errors", () => {
    expect(mapGeminiError(apiError(429, "Resource exhausted")).code).toBe("rate_limit");
    expect(mapGeminiError(apiError(503, "The model is overloaded")).code).toBe("overloaded");
    expect(mapGeminiError(apiError(400, "Invalid argument")).code).toBe("bad_request");
    expect(mapGeminiError(apiError(500, "Internal")).code).toBe("unknown");
  });

  it("maps network failures to connection", () => {
    expect(mapGeminiError(new TypeError("fetch failed")).code).toBe("connection");
  });
});

describe("isRefusal", () => {
  it("detects safety stops and prompt blocks", () => {
    expect(isRefusal("SAFETY", undefined)).toBe(true);
    expect(isRefusal(undefined, "PROHIBITED_CONTENT")).toBe(true);
    expect(isRefusal("STOP", undefined)).toBe(false);
    expect(isRefusal(undefined, undefined)).toBe(false);
  });
});
