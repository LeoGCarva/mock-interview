import { z } from "zod";
import { LANGUAGES, QUESTION_COUNTS } from "./i18n";

export const LIMITS = {
  jobDescriptionMin: 50,
  jobDescriptionMax: 20_000,
  messageMax: 10_000,
  /** Largest history: every question answered plus the closing turn. */
  historyMax: Math.max(...QUESTION_COUNTS) * 2 + 1,
} as const;

export const ChatTurnSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string().trim().min(1).max(LIMITS.messageMax),
});
/** One turn of the interview. `assistant` = interviewer, `user` = candidate. */
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const LanguageSchema = z.enum(LANGUAGES);
export const QuestionCountSchema = z.literal(QUESTION_COUNTS);

const JobDescriptionSchema = z
  .string()
  .trim()
  .min(LIMITS.jobDescriptionMin)
  .max(LIMITS.jobDescriptionMax);

const HistorySchema = z.array(ChatTurnSchema).max(LIMITS.historyMax);

export function countAnswers(history: readonly ChatTurn[]): number {
  return history.filter((turn) => turn.role === "user").length;
}

/** History must start with the interviewer and alternate interviewer/candidate. */
export function alternatesFromInterviewer(history: readonly ChatTurn[]): boolean {
  return history.every((turn, i) => turn.role === (i % 2 === 0 ? "assistant" : "user"));
}

export const InterviewRequestSchema = z
  .object({
    jobDescription: JobDescriptionSchema,
    language: LanguageSchema,
    totalQuestions: QuestionCountSchema,
    history: HistorySchema,
  })
  .superRefine((value, ctx) => {
    const { history, totalQuestions } = value;
    if (!alternatesFromInterviewer(history)) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "History must start with the interviewer and alternate turns.",
      });
    }
    if (history.length > 0 && history[history.length - 1].role !== "user") {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "History must end with the candidate's answer.",
      });
    }
    if (countAnswers(history) > totalQuestions) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "More answers than questions in this interview.",
      });
    }
  });
export type InterviewRequest = z.infer<typeof InterviewRequestSchema>;

export const FeedbackRequestSchema = z
  .object({
    jobDescription: JobDescriptionSchema,
    language: LanguageSchema,
    history: HistorySchema,
  })
  .superRefine((value, ctx) => {
    if (!alternatesFromInterviewer(value.history)) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "History must start with the interviewer and alternate turns.",
      });
    }
    if (countAnswers(value.history) < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "At least one answer is needed to generate feedback.",
      });
    }
  });
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

/**
 * Structured output returned by Gemini for the feedback report. Ranges live in
 * descriptions (structured outputs don't enforce numeric bounds); the UI clamps
 * scores to 1–10.
 */
export const FeedbackSchema = z.object({
  overallScore: z
    .number()
    .int()
    .describe("Overall interview performance from 1 (very weak) to 10 (outstanding)."),
  summary: z.string().describe("Two to four sentences with the overall assessment."),
  strengths: z.array(z.string()).describe("Two to four strongest points the candidate showed."),
  improvements: z
    .array(z.string())
    .describe("Two to four most important, actionable things to improve."),
  questions: z
    .array(
      z.object({
        question: z.string().describe("The interviewer's question, briefly paraphrased."),
        answerSummary: z.string().describe("One or two sentences summarizing the candidate's answer."),
        score: z.number().int().describe("Score for this answer from 1 to 10."),
        whatWentWell: z.string().describe("What was good about this answer."),
        toImprove: z.string().describe("The most important weakness of this answer."),
        strongerAnswerTip: z
          .string()
          .describe("A concrete outline of how a stronger answer to this question would go."),
      }),
    )
    .describe("One entry per answered interviewer question, in interview order."),
  nextSteps: z.array(z.string()).describe("Two to four concrete practice suggestions."),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const API_ERROR_CODES = [
  "missing_api_key",
  "auth",
  "rate_limit",
  "overloaded",
  "connection",
  "refusal",
  "bad_request",
  "unknown",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
