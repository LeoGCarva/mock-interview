import { describe, expect, it } from "vitest";
import { FeedbackRequestSchema, InterviewRequestSchema, LIMITS } from "../src/lib/schemas";

const jobDescription =
  "Senior Frontend Engineer at Acme. React, TypeScript, Next.js, accessibility, testing.";
const base = { jobDescription, language: "en-US", totalQuestions: 3 } as const;

describe("InterviewRequestSchema", () => {
  it("accepts the opening request", () => {
    expect(InterviewRequestSchema.safeParse({ ...base, history: [] }).success).toBe(true);
  });

  it("accepts a history ending with the candidate's answer", () => {
    const history = [
      { role: "assistant", content: "Tell me about yourself." },
      { role: "user", content: "I am a frontend engineer." },
    ];
    expect(InterviewRequestSchema.safeParse({ ...base, history }).success).toBe(true);
  });

  it("rejects a history that ends with the interviewer", () => {
    const history = [{ role: "assistant", content: "Tell me about yourself." }];
    expect(InterviewRequestSchema.safeParse({ ...base, history }).success).toBe(false);
  });

  it("rejects histories that don't alternate from the interviewer", () => {
    const history = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ];
    expect(InterviewRequestSchema.safeParse({ ...base, history }).success).toBe(false);
  });

  it("rejects more answers than questions", () => {
    const history = Array.from({ length: 8 }, (_, i) => ({
      role: i % 2 === 0 ? "assistant" : "user",
      content: `turn ${i}`,
    }));
    expect(InterviewRequestSchema.safeParse({ ...base, history }).success).toBe(false);
  });

  it("rejects unsupported settings and oversized input", () => {
    const parse = (overrides: object) =>
      InterviewRequestSchema.safeParse({ ...base, history: [], ...overrides }).success;
    expect(parse({ totalQuestions: 4 })).toBe(false);
    expect(parse({ language: "fr-FR" })).toBe(false);
    expect(parse({ jobDescription: "too short" })).toBe(false);
    expect(parse({ jobDescription: "x".repeat(LIMITS.jobDescriptionMax + 1) })).toBe(false);
    expect(
      parse({
        history: [
          { role: "assistant", content: "Q" },
          { role: "user", content: "a".repeat(LIMITS.messageMax + 1) },
        ],
      }),
    ).toBe(false);
  });
});

describe("FeedbackRequestSchema", () => {
  it("needs at least one answer", () => {
    const history = [{ role: "assistant", content: "Tell me about yourself." }];
    expect(
      FeedbackRequestSchema.safeParse({ jobDescription, language: "pt-BR", history }).success,
    ).toBe(false);
  });

  it("accepts a history that ends with an unanswered question (ended early)", () => {
    const history = [
      { role: "assistant", content: "Q1" },
      { role: "user", content: "A1" },
      { role: "assistant", content: "Q2" },
    ];
    expect(
      FeedbackRequestSchema.safeParse({ jobDescription, language: "pt-BR", history }).success,
    ).toBe(true);
  });
});
