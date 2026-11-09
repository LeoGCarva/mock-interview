import { describe, expect, it } from "vitest";
import { getStage } from "../src/lib/interview";
import { buildStageInstruction } from "../src/lib/prompts";

describe("getStage", () => {
  it("opens with question 1", () => {
    expect(getStage(0, 5)).toEqual({ kind: "opening", questionNumber: 1, totalQuestions: 5 });
  });

  it("asks the next question while answers remain", () => {
    expect(getStage(1, 5)).toEqual({ kind: "question", questionNumber: 2, totalQuestions: 5 });
    expect(getStage(4, 5)).toEqual({ kind: "question", questionNumber: 5, totalQuestions: 5 });
  });

  it("closes after the last answer", () => {
    expect(getStage(5, 5)).toEqual({ kind: "closing", totalQuestions: 5 });
    expect(getStage(6, 5).kind).toBe("closing");
  });
});

describe("buildStageInstruction", () => {
  it("marks the final question", () => {
    expect(buildStageInstruction(getStage(2, 3))).toContain("final question");
    expect(buildStageInstruction(getStage(1, 3))).not.toContain("final question");
  });

  it("forbids new questions when closing", () => {
    expect(buildStageInstruction(getStage(3, 3))).toContain("Do not ask any more questions");
  });
});
