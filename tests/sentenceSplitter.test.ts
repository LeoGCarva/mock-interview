import { describe, expect, it } from "vitest";
import {
  createSentenceSplitter,
  extractSentences,
  splitIntoSentences,
} from "../src/lib/sentenceSplitter";

describe("extractSentences", () => {
  it("emits complete sentences and keeps the unfinished rest", () => {
    const { sentences, rest } = extractSentences(
      "Thanks for joining us today. Could you tell me about your last proj",
    );
    expect(sentences).toEqual(["Thanks for joining us today."]);
    expect(rest).toBe("Could you tell me about your last proj");
  });

  it("does not split decimals, versions or dotted names", () => {
    const text = "You worked with Node.js 3.5 years ago, right? ";
    expect(extractSentences(text).sentences).toEqual([
      "You worked with Node.js 3.5 years ago, right?",
    ]);
  });

  it("does not split after abbreviations or initials", () => {
    const text = "I reported to Dr. Smith and J. Silva at the time. Next part";
    expect(extractSentences(text).sentences).toEqual([
      "I reported to Dr. Smith and J. Silva at the time.",
    ]);
  });

  it("handles Portuguese abbreviations", () => {
    const text = "Você trabalhou com a Sra. Oliveira no projeto anterior? Depois";
    expect(extractSentences(text).sentences).toEqual([
      "Você trabalhou com a Sra. Oliveira no projeto anterior?",
    ]);
  });

  it("merges short sentences with the next one", () => {
    const text = "Great. Thanks. Let us move on to the next question now. ";
    expect(extractSentences(text).sentences).toEqual([
      "Great. Thanks. Let us move on to the next question now.",
    ]);
  });

  it("splits on line breaks", () => {
    const text = "This is the first line of the reply\nAnd here comes more";
    expect(extractSentences(text).sentences).toEqual(["This is the first line of the reply"]);
  });
});

describe("splitIntoSentences", () => {
  it("includes the trailing text without punctuation", () => {
    expect(splitIntoSentences("Welcome to the interview today! Tell me about yourself")).toEqual([
      "Welcome to the interview today!",
      "Tell me about yourself",
    ]);
  });

  it("returns nothing for blank text", () => {
    expect(splitIntoSentences("   ")).toEqual([]);
  });
});

describe("createSentenceSplitter", () => {
  it("emits sentences as streamed deltas complete them, then flushes the rest", () => {
    const out: string[] = [];
    const splitter = createSentenceSplitter((s) => out.push(s));
    for (const delta of ["Hello and wel", "come to the interview. ", "Tell me", " about yourself?"]) {
      splitter.push(delta);
    }
    expect(out).toEqual(["Hello and welcome to the interview."]);
    splitter.flush();
    expect(out).toEqual(["Hello and welcome to the interview.", "Tell me about yourself?"]);
  });
});
