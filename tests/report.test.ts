import { describe, expect, it } from "vitest";
import { buildMarkdownReport, clampScore } from "../src/lib/report";

describe("report", () => {
  it("clamps scores to 1-10", () => {
    expect(clampScore(0)).toBe(1);
    expect(clampScore(7.4)).toBe(7);
    expect(clampScore(12)).toBe(10);
  });

  it("builds a Markdown report with feedback, transcript and job description", () => {
    const md = buildMarkdownReport({
      language: "en-US",
      jobDescription: "Backend engineer\nGo and Postgres",
      transcript: [
        { role: "assistant", content: "Tell me about yourself." },
        { role: "user", content: "I build APIs." },
      ],
      feedback: {
        overallScore: 7,
        summary: "Solid.",
        strengths: ["Clear"],
        improvements: ["More metrics"],
        questions: [
          {
            question: "Background",
            answerSummary: "Builds APIs",
            score: 6,
            whatWentWell: "Concise",
            toImprove: "Add impact",
            strongerAnswerTip: "Mention scale",
          },
        ],
        nextSteps: ["Practice STAR"],
      },
      generatedAt: new Date("2026-11-09T12:00:00Z"),
    });
    expect(md).toContain("# Interview feedback");
    expect(md).toContain("## Overall score: 7/10");
    expect(md).toContain("### 1. Background (6/10)");
    expect(md).toContain("**Interviewer:** Tell me about yourself.");
    expect(md).toContain("> Go and Postgres");
  });
});
