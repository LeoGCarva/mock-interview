"use client";

import type { ReactNode } from "react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { getMessages, type Language } from "@/lib/i18n";
import type { InterviewSettings } from "@/lib/interview";
import { buildMarkdownReport, clampScore, downloadTextFile } from "@/lib/report";
import type { ApiErrorCode, ChatTurn, Feedback } from "@/lib/schemas";
import { ArrowUpIcon, CheckIcon, DownloadIcon, ReplayIcon, StopIcon, VolumeIcon } from "./icons";
import { Button, Notice, Spinner } from "./ui";

export type FeedbackState =
  | { status: "loading" }
  | { status: "ready"; feedback: Feedback }
  | { status: "error"; code: ApiErrorCode };

interface FeedbackReportProps {
  settings: InterviewSettings;
  transcript: readonly ChatTurn[];
  state: FeedbackState;
  onRetry: () => void;
  onPracticeAgain: () => void;
  onNewJob: () => void;
}

function scoreTone(score: number): string {
  if (score >= 8) return "text-success";
  if (score >= 5) return "text-warning";
  return "text-danger";
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`relative size-28 shrink-0 ${scoreTone(score)}`} role="img" aria-label={`${label}: ${score}/10`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 10)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score}</span>
        <span className="text-xs text-muted">/10</span>
      </span>
    </div>
  );
}

function BulletCard({
  title,
  items,
  icon,
}: {
  title: string;
  items: readonly string[];
  icon: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 font-medium">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Actions({
  language,
  onPracticeAgain,
  onNewJob,
}: {
  language: Language;
  onPracticeAgain: () => void;
  onNewJob: () => void;
}) {
  const t = getMessages(language);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={onPracticeAgain}>
        <ReplayIcon width={16} height={16} />
        {t.practiceAgain}
      </Button>
      <Button onClick={onNewJob}>{t.newJob}</Button>
    </div>
  );
}

export function FeedbackReport({
  settings,
  transcript,
  state,
  onRetry,
  onPracticeAgain,
  onNewJob,
}: FeedbackReportProps) {
  const { language } = settings;
  const t = getMessages(language);
  const tts = useSpeechSynthesis({ language, voiceURI: settings.voiceURI });

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <Spinner className="size-8 text-accent" />
        <div>
          <p className="font-medium">{t.generatingFeedback}</p>
          <p className="mt-1 text-sm text-muted">{t.generatingFeedbackHint}</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4">
        <Notice tone="danger">
          <p className="font-medium">{t.feedbackFailed}</p>
          <p>{t.apiErrors[state.code] ?? t.apiErrors.unknown}</p>
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onRetry}>
            {t.retry}
          </Button>
          <Button onClick={onNewJob}>{t.newJob}</Button>
        </div>
      </div>
    );
  }

  const { feedback } = state;
  const overall = clampScore(feedback.overallScore);

  function handleDownload() {
    const content = buildMarkdownReport({
      language,
      jobDescription: settings.jobDescription,
      transcript,
      feedback,
      generatedAt: new Date(),
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`${t.reportFileName}-${date}.md`, content);
  }

  function handleReadSummary() {
    if (tts.speaking) {
      tts.cancel();
      return;
    }
    tts.speakText(`${t.overallScore}: ${overall}/10. ${feedback.summary}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{t.appTitle}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t.feedbackTitle}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {tts.supported && (
            <Button onClick={handleReadSummary}>
              {tts.speaking ? <StopIcon width={16} height={16} /> : <VolumeIcon width={16} height={16} />}
              {tts.speaking ? t.stopReading : t.readSummary}
            </Button>
          )}
          <Button onClick={handleDownload}>
            <DownloadIcon width={16} height={16} />
            {t.download}
          </Button>
        </div>
      </header>

      <section className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <ScoreRing score={overall} label={t.overallScore} />
        <div>
          <h2 className="mb-1 text-sm font-medium text-muted">{t.overallScore}</h2>
          <p className="leading-relaxed">{feedback.summary}</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <BulletCard
          title={t.strengths}
          items={feedback.strengths}
          icon={<CheckIcon width={16} height={16} className="text-success" />}
        />
        <BulletCard
          title={t.improvements}
          items={feedback.improvements}
          icon={<ArrowUpIcon width={16} height={16} className="text-warning" />}
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t.questionByQuestion}</h2>
        <ol className="space-y-3">
          {feedback.questions.map((q, i) => {
            const score = clampScore(q.score);
            return (
              <li key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-medium">
                    <span className="text-muted">{i + 1}. </span>
                    {q.question}
                  </h3>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${scoreTone(score)}`}>
                    {t.scoreOutOf(score)}
                  </span>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-muted">{t.answerSummary}</dt>
                    <dd className="mt-0.5">{q.answerSummary}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-success">{t.whatWentWell}</dt>
                    <dd className="mt-0.5">{q.whatWentWell}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-warning">{t.toImprove}</dt>
                    <dd className="mt-0.5">{q.toImprove}</dd>
                  </div>
                  <div className="rounded-xl bg-accent-soft p-3 sm:col-span-2">
                    <dt className="text-xs font-medium text-accent-strong">{t.strongerAnswer}</dt>
                    <dd className="mt-0.5">{q.strongerAnswerTip}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ol>
      </section>

      <BulletCard
        title={t.nextSteps}
        items={feedback.nextSteps}
        icon={<span className="text-accent">→</span>}
      />

      <details className="rounded-2xl border border-border bg-card p-5">
        <summary className="cursor-pointer font-medium">{t.transcript}</summary>
        <div className="mt-4 space-y-3 text-sm">
          {transcript.map((turn, i) => (
            <p key={i}>
              <span className="font-medium">{turn.role === "assistant" ? t.interviewer : t.you}: </span>
              {turn.content}
            </p>
          ))}
        </div>
      </details>

      <Actions language={language} onPracticeAgain={onPracticeAgain} onNewJob={onNewJob} />
    </div>
  );
}
