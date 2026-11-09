import { getMessages, type Language } from "./i18n";
import type { ChatTurn, Feedback } from "./schemas";

export function clampScore(score: number): number {
  return Math.min(10, Math.max(1, Math.round(score)));
}

interface ReportInput {
  language: Language;
  jobDescription: string;
  transcript: readonly ChatTurn[];
  feedback: Feedback;
  generatedAt: Date;
}

/** Builds the downloadable Markdown report (feedback + transcript + job description). */
export function buildMarkdownReport({
  language,
  jobDescription,
  transcript,
  feedback,
  generatedAt,
}: ReportInput): string {
  const t = getMessages(language);
  const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");
  const lines: string[] = [
    `# ${t.feedbackTitle}`,
    "",
    `_${t.reportGeneratedOn(generatedAt.toLocaleString(language))}_`,
    "",
    `## ${t.overallScore}: ${t.scoreOutOf(clampScore(feedback.overallScore))}`,
    "",
    feedback.summary,
    "",
    `## ${t.strengths}`,
    "",
    list(feedback.strengths),
    "",
    `## ${t.improvements}`,
    "",
    list(feedback.improvements),
    "",
    `## ${t.questionByQuestion}`,
    "",
  ];

  feedback.questions.forEach((q, i) => {
    lines.push(
      `### ${i + 1}. ${q.question} (${t.scoreOutOf(clampScore(q.score))})`,
      "",
      `**${t.answerSummary}:** ${q.answerSummary}`,
      "",
      `**${t.whatWentWell}:** ${q.whatWentWell}`,
      "",
      `**${t.toImprove}:** ${q.toImprove}`,
      "",
      `**${t.strongerAnswer}:** ${q.strongerAnswerTip}`,
      "",
    );
  });

  lines.push(`## ${t.nextSteps}`, "", list(feedback.nextSteps), "", `## ${t.transcript}`, "");
  transcript.forEach((turn) => {
    lines.push(`**${turn.role === "assistant" ? t.interviewer : t.you}:** ${turn.content}`, "");
  });

  const quotedJob = jobDescription
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
  lines.push(`## ${t.jobDescription}`, "", quotedJob, "");
  return lines.join("\n");
}

export function downloadTextFile(fileName: string, content: string, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
