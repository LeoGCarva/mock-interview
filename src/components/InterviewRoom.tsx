"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { InterviewApiError, streamInterviewerTurn } from "@/lib/apiClient";
import { getMessages } from "@/lib/i18n";
import type { InterviewSettings } from "@/lib/interview";
import { LIMITS, countAnswers, type ApiErrorCode, type ChatTurn } from "@/lib/schemas";
import { createSentenceSplitter } from "@/lib/sentenceSplitter";
import { ConversationView } from "./ConversationView";
import { LiveTranscript } from "./LiveTranscript";
import {
  MicIcon,
  ReplayIcon,
  SendIcon,
  SkipIcon,
  StopIcon,
  VolumeIcon,
  VolumeOffIcon,
  XIcon,
} from "./icons";
import { Button, Notice } from "./ui";

type TurnStatus = "thinking" | "streaming" | "ready" | "error";

interface InterviewRoomProps {
  settings: InterviewSettings;
  /** Called as soon as the last answer is submitted, so feedback generation can start early. */
  onFinalAnswer: (history: ChatTurn[]) => void;
  /** Called when the interview is over: closing remarks spoken, or ended early. */
  onComplete: (history: ChatTurn[]) => void;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function useElapsed(startedAt: number | null): string | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt === null ? undefined : formatElapsed(Math.max(0, now - startedAt));
}

function InterviewerAvatar({ active }: { active: boolean }) {
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center">
      {active && <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />}
      <span className="relative flex size-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        AI
      </span>
    </span>
  );
}

export function InterviewRoom({ settings, onFinalAnswer, onComplete }: InterviewRoomProps) {
  const { jobDescription, language, totalQuestions, voiceURI } = settings;
  const t = getMessages(language);

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<TurnStatus>("thinking");
  const [apiError, setApiError] = useState<ApiErrorCode | null>(null);
  const [muted, setMuted] = useState(false);
  const [nothingHeard, setNothingHeard] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const {
    supported: ttsSupported,
    speaking,
    speak,
    speakText,
    cancel: cancelSpeech,
  } = useSpeechSynthesis({ language, voiceURI, muted });
  const stt = useSpeechRecognition(language);
  const {
    start: startListening,
    stop: stopListening,
    abort: abortListening,
    reset: resetListening,
  } = stt;
  const elapsed = useElapsed(stt.startedAt);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const completedRef = useRef(false);

  const answersGiven = countAnswers(history);
  const isClosing = answersGiven >= totalQuestions;
  const candidateTurn = status === "ready" && !speaking && !isClosing;
  const closingDone = status === "ready" && !speaking && isClosing;
  const interrupted = candidateTurn && !stt.listening && !finishing && stt.finalText.length > 0;

  const lastQuestion = useMemo(() => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "assistant") return history[i].content;
    }
    return null;
  }, [history]);

  /**
   * STEP 2 → STEP 3: stream the interviewer's next turn from Gemini, showing
   * the text as it arrives and speaking it sentence by sentence.
   */
  const streamTurn = useCallback(
    async (baseHistory: ChatTurn[], controller: AbortController) => {
      const splitter = createSentenceSplitter(speak);
      try {
        const reply = await streamInterviewerTurn(
          { jobDescription, language, totalQuestions, history: baseHistory },
          (delta) => {
            if (controller.signal.aborted) return;
            setStatus("streaming");
            setStreamingText((previous) => previous + delta);
            splitter.push(delta);
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        splitter.flush();
        setHistory([...baseHistory, { role: "assistant", content: reply }]);
        setStreamingText("");
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        cancelSpeech();
        setStreamingText("");
        setApiError(error instanceof InterviewApiError ? error.code : "unknown");
        setStatus("error");
      }
    },
    [jobDescription, language, totalQuestions, speak, cancelSpeech],
  );

  const runInterviewerTurn = useCallback(
    (baseHistory: ChatTurn[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      cancelSpeech();
      setStreamingText("");
      setApiError(null);
      setStatus("thinking");
      void streamTurn(baseHistory, controller);
    },
    [cancelSpeech, streamTurn],
  );

  // The opening question is requested once, when the room mounts (a data fetch
  // on mount). The initial state already shows "thinking", so nothing is reset
  // here; streamTurn only sets state after the network request resolves.
  const startInterview = useEffectEvent(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    void streamTurn([], controller);
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state updates happen asynchronously, after fetch
    startInterview();
    return () => abortRef.current?.abort();
  }, []);

  // After the closing remarks have been spoken, hand over to the feedback screen.
  useEffect(() => {
    if (closingDone && !completedRef.current) {
      completedRef.current = true;
      onComplete(history);
    }
  }, [closingDone, history, onComplete]);

  function submitAnswer(text: string) {
    const next: ChatTurn[] = [
      ...history,
      { role: "user", content: text.slice(0, LIMITS.messageMax) },
    ];
    resetListening();
    setNothingHeard(false);
    setHistory(next);
    if (countAnswers(next) >= totalQuestions) onFinalAnswer(next);
    runInterviewerTurn(next);
  }

  function handleStartAnswer() {
    setNothingHeard(false);
    startListening();
  }

  function handleContinueAnswer() {
    setNothingHeard(false);
    startListening({ append: true });
  }

  async function handleFinishAnswer() {
    setFinishing(true);
    const text = (await stopListening()).trim();
    setFinishing(false);
    if (!text) {
      resetListening();
      setNothingHeard(true);
      return;
    }
    submitAnswer(text);
  }

  function handleSubmitCaptured() {
    const text = stt.finalText.trim();
    if (text) submitAnswer(text);
  }

  function handleReplay() {
    if (!lastQuestion) return;
    cancelSpeech();
    speakText(lastQuestion);
  }

  function handleToggleMute() {
    if (!muted) cancelSpeech();
    setMuted(!muted);
  }

  function leave() {
    completedRef.current = true;
    abortRef.current?.abort();
    abortListening();
    cancelSpeech();
    onComplete(history);
  }

  function handleEnd() {
    if (window.confirm(t.confirmEnd)) leave();
  }

  let statusText: string;
  if (status === "error") statusText = t.apiErrors[apiError ?? "unknown"] ?? t.statusError;
  else if (status === "thinking") statusText = t.statusThinking;
  else if (status === "streaming" || speaking) statusText = t.statusSpeaking;
  else if (isClosing) statusText = t.statusClosing;
  else if (stt.listening) statusText = t.statusListening;
  else if (interrupted) statusText = t.statusInterrupted;
  else statusText = t.statusYourTurn;

  const progressLabel = isClosing
    ? t.closingProgress
    : t.questionProgress(Math.min(answersGiven + 1, totalQuestions), totalQuestions);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="truncate text-sm font-semibold">{t.appTitle}</h1>
              <span className="text-xs text-muted tabular-nums">{progressLabel}</span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalQuestions}
              aria-valuenow={answersGiven}
              aria-label={progressLabel}
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${(answersGiven / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          {ttsSupported && (
            <Button
              variant="ghost"
              onClick={handleToggleMute}
              aria-pressed={muted}
              title={muted ? t.unmute : t.mute}
              className="px-3"
            >
              {muted ? <VolumeOffIcon width={18} height={18} /> : <VolumeIcon width={18} height={18} />}
              <span className="hidden sm:inline">{muted ? t.unmute : t.mute}</span>
            </Button>
          )}
          <Button variant="danger" onClick={handleEnd} className="px-3">
            <XIcon width={16} height={16} />
            <span className="hidden sm:inline">{t.endInterview}</span>
          </Button>
        </div>
      </header>

      <main
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <ConversationView
            turns={history}
            streamingText={streamingText}
            thinking={status === "thinking"}
            interviewerLabel={t.interviewer}
            candidateLabel={t.you}
            scrollRef={scrollRef}
          />
        </div>
      </main>

      <footer className="border-t border-border bg-card/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <InterviewerAvatar active={speaking || status === "streaming"} />
            <p role="status" className={`flex-1 text-sm ${status === "error" ? "text-danger" : ""}`}>
              {statusText}
            </p>
            {ttsSupported && speaking && (
              <Button variant="ghost" onClick={cancelSpeech} className="px-3">
                <SkipIcon width={16} height={16} />
                <span className="hidden sm:inline">{t.stopVoice}</span>
              </Button>
            )}
            {ttsSupported && !speaking && candidateTurn && !stt.listening && lastQuestion && (
              <Button variant="ghost" onClick={handleReplay} disabled={muted} className="px-3">
                <ReplayIcon width={16} height={16} />
                <span className="hidden sm:inline">{t.replay}</span>
              </Button>
            )}
          </div>

          {status === "error" && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => runInterviewerTurn(history)}>
                {t.retry}
              </Button>
              {answersGiven === 0 && <Button onClick={leave}>{t.backToSetup}</Button>}
            </div>
          )}

          {stt.error && (
            <Notice tone="danger">{t.sttErrors[stt.error] ?? t.sttErrors.default}</Notice>
          )}
          {nothingHeard && <Notice>{t.nothingHeard}</Notice>}

          {candidateTurn && (
            <>
              <LiveTranscript
                finalText={stt.finalText}
                interimText={stt.interimText}
                listening={stt.listening}
                label={t.liveTranscriptLabel}
                readOnlyLabel={t.readOnly}
                placeholder={t.liveTranscriptEmpty}
                elapsed={elapsed}
              />
              <div className="flex flex-wrap justify-end gap-2">
                {stt.listening || finishing ? (
                  <Button
                    onClick={() => void handleFinishAnswer()}
                    disabled={finishing}
                    className="bg-danger px-6 py-2.5 text-white hover:opacity-90"
                  >
                    <StopIcon width={16} height={16} />
                    {t.finishAnswer}
                  </Button>
                ) : interrupted ? (
                  <>
                    <Button onClick={handleContinueAnswer} className="px-5 py-2.5">
                      <MicIcon width={16} height={16} />
                      {t.continueAnswer}
                    </Button>
                    <Button variant="primary" onClick={handleSubmitCaptured} className="px-5 py-2.5">
                      <SendIcon width={16} height={16} />
                      {t.submitAnswer}
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={handleStartAnswer} className="px-6 py-2.5">
                    <MicIcon width={16} height={16} />
                    {t.startAnswer}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
