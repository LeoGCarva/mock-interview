import type { Language, QuestionCount } from "./i18n";

/**
 * Which kind of interviewer turn comes next. Derived only from the number of
 * answers given so far, so the client and the server always agree.
 */
export type Stage =
  | { kind: "opening"; questionNumber: 1; totalQuestions: number }
  | { kind: "question"; questionNumber: number; totalQuestions: number }
  | { kind: "closing"; totalQuestions: number };

export function getStage(answersGiven: number, totalQuestions: number): Stage {
  if (answersGiven <= 0) return { kind: "opening", questionNumber: 1, totalQuestions };
  if (answersGiven >= totalQuestions) return { kind: "closing", totalQuestions };
  return { kind: "question", questionNumber: answersGiven + 1, totalQuestions };
}

export interface InterviewSettings {
  jobDescription: string;
  language: Language;
  totalQuestions: QuestionCount;
  /** Chosen TTS voice, or null for the automatic best match. */
  voiceURI: string | null;
}
