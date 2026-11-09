"use client";

import { useCallback, useRef, useState } from "react";
import { useBrowserLanguage } from "@/hooks/useClientValue";
import { InterviewApiError, fetchFeedback } from "@/lib/apiClient";
import type { Language } from "@/lib/i18n";
import type { InterviewSettings } from "@/lib/interview";
import { countAnswers, type ChatTurn } from "@/lib/schemas";
import { FeedbackReport, type FeedbackState } from "./FeedbackReport";
import { InterviewRoom } from "./InterviewRoom";
import { SetupForm } from "./SetupForm";

type Phase = "setup" | "interview" | "feedback";

/**
 * Top-level state machine: setup → interview → feedback.
 * All session state lives here, in memory; nothing is persisted.
 */
export function InterviewApp() {
  const browserLanguage = useBrowserLanguage();
  const [languageChoice, setLanguageChoice] = useState<Language | null>(null);
  const language = languageChoice ?? browserLanguage;

  const [phase, setPhase] = useState<Phase>("setup");
  const [settings, setSettings] = useState<InterviewSettings | null>(null);
  const [transcript, setTranscript] = useState<ChatTurn[]>([]);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({ status: "loading" });
  const [sessionKey, setSessionKey] = useState(0);

  const feedbackAbortRef = useRef<AbortController | null>(null);
  const feedbackRequestedRef = useRef(false);

  const requestFeedback = useCallback((current: InterviewSettings, history: ChatTurn[]) => {
    feedbackAbortRef.current?.abort();
    const controller = new AbortController();
    feedbackAbortRef.current = controller;
    feedbackRequestedRef.current = true;
    setFeedbackState({ status: "loading" });
    fetchFeedback(
      { jobDescription: current.jobDescription, language: current.language, history },
      controller.signal,
    )
      .then((feedback) => {
        if (!controller.signal.aborted) setFeedbackState({ status: "ready", feedback });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFeedbackState({
          status: "error",
          code: error instanceof InterviewApiError ? error.code : "unknown",
        });
      });
  }, []);

  const startSession = useCallback((next: InterviewSettings) => {
    feedbackAbortRef.current?.abort();
    feedbackRequestedRef.current = false;
    setSettings(next);
    setLanguageChoice(next.language);
    setTranscript([]);
    setFeedbackState({ status: "loading" });
    setSessionKey((key) => key + 1);
    setPhase("interview");
  }, []);

  // Feedback starts as soon as the last answer is in, while the interviewer says goodbye.
  const handleFinalAnswer = useCallback(
    (history: ChatTurn[]) => {
      if (settings) requestFeedback(settings, history);
    },
    [settings, requestFeedback],
  );

  const handleComplete = useCallback(
    (history: ChatTurn[]) => {
      if (!settings) return;
      if (countAnswers(history) === 0) {
        setPhase("setup"); // ended before answering anything
        return;
      }
      setTranscript(history);
      if (!feedbackRequestedRef.current) requestFeedback(settings, history);
      setPhase("feedback");
    },
    [settings, requestFeedback],
  );

  if (phase === "interview" && settings) {
    return (
      <InterviewRoom
        key={sessionKey}
        settings={settings}
        onFinalAnswer={handleFinalAnswer}
        onComplete={handleComplete}
      />
    );
  }

  if (phase === "feedback" && settings) {
    return (
      <FeedbackReport
        settings={settings}
        transcript={transcript}
        state={feedbackState}
        onRetry={() => requestFeedback(settings, transcript)}
        onPracticeAgain={() => startSession(settings)}
        onNewJob={() => {
          setSettings({ ...settings, jobDescription: "" });
          setSessionKey((key) => key + 1);
          setPhase("setup");
        }}
      />
    );
  }

  return (
    <SetupForm
      key={sessionKey}
      language={language}
      onLanguageChange={setLanguageChoice}
      initial={settings}
      onStart={startSession}
    />
  );
}
