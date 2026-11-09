"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/i18n";
import { useClientValue } from "./useClientValue";

/*
 * STEP 1 — Voice to text, using the browser's Web Speech API.
 * TypeScript's DOM lib doesn't declare SpeechRecognition, so the minimal
 * shapes used here are declared locally.
 */

interface RecognitionAlternativeLike {
  transcript: string;
}
interface RecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternativeLike;
}
interface RecognitionEventLike {
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResultLike };
}
interface RecognitionErrorEventLike {
  readonly error: string;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => RecognitionLike;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const isRecognitionSupported = () => getRecognitionConstructor() !== null;

export function useSpeechRecognitionSupported(): boolean {
  // Assume support on the server so the warning banner doesn't flash.
  return useClientValue(isRecognitionSupported, true);
}

/** Errors that end the answer; anything else just triggers an automatic restart. */
const FATAL_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "network",
  "language-not-supported",
  "bad-grammar",
]);

const RESTART_DELAY_MS = 150;
const STOP_TIMEOUT_MS = 2500;

const joinParts = (parts: readonly string[]) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

function detach(recognition: RecognitionLike) {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
}

export interface SpeechRecognitionControls {
  supported: boolean;
  listening: boolean;
  /** Confirmed text of the current answer (read-only for the user). */
  finalText: string;
  /** Words still being recognized; may change until confirmed. */
  interimText: string;
  /** Last fatal error code (e.g. "not-allowed", "network"), if any. */
  error: string | null;
  startedAt: number | null;
  /** Starts listening. `append` keeps the text captured so far. */
  start: (options?: { append?: boolean }) => void;
  /** Stops listening and resolves with the full answer once the browser finalizes it. */
  stop: () => Promise<string>;
  /** Stops immediately and drops pending results. */
  abort: () => void;
  /** Aborts and clears the captured text. */
  reset: () => void;
}

export function useSpeechRecognition(language: Language): SpeechRecognitionControls {
  const supported = useSpeechRecognitionSupported();
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const committedRef = useRef<string[]>([]);
  const sessionFinalRef = useRef("");
  const interimRef = useRef("");
  const resolversRef = useRef<Array<(text: string) => void>>([]);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    restartTimerRef.current = null;
    stopTimerRef.current = null;
  }, []);

  /** Moves the current session's text (final + leftover interim) into the answer. */
  const commitSession = useCallback(() => {
    const parts = [sessionFinalRef.current, interimRef.current].filter((p) => p.trim());
    committedRef.current.push(...parts);
    sessionFinalRef.current = "";
    interimRef.current = "";
  }, []);

  const finalize = useCallback(() => {
    clearTimers();
    wantListeningRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition) detach(recognition);
    recognitionRef.current = null;
    commitSession();
    const text = joinParts(committedRef.current);
    setFinalText(text);
    setInterimText("");
    setListening(false);
    setStartedAt(null);
    const resolvers = resolversRef.current;
    resolversRef.current = [];
    resolvers.forEach((resolve) => resolve(text));
  }, [clearTimers, commitSession]);

  const createRecognition = useCallback((): RecognitionLike | null => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) return null;
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let sessionFinal = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) sessionFinal += transcript;
        else interim += transcript;
      }
      sessionFinalRef.current = sessionFinal;
      interimRef.current = interim;
      setFinalText(joinParts([...committedRef.current, sessionFinal]));
      setInterimText(interim.trim());
    };

    recognition.onerror = (event) => {
      if (!FATAL_ERRORS.has(event.error)) return; // e.g. "no-speech": onend restarts
      wantListeningRef.current = false;
      setError(event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      commitSession();
      if (!wantListeningRef.current) {
        finalize();
        return;
      }
      // Browsers end recognition after silence even in continuous mode:
      // keep listening until the candidate presses "Finish answer".
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!wantListeningRef.current || recognitionRef.current !== recognition) {
          finalize();
          return;
        }
        try {
          recognition.start();
        } catch {
          finalize();
        }
      }, RESTART_DELAY_MS);
    };

    return recognition;
  }, [language, commitSession, finalize]);

  const start = useCallback(
    (options?: { append?: boolean }) => {
      if (wantListeningRef.current) return;
      const recognition = createRecognition();
      if (!recognition) {
        setError("service-not-allowed");
        return;
      }
      if (!options?.append) {
        committedRef.current = [];
        setFinalText("");
      }
      sessionFinalRef.current = "";
      interimRef.current = "";
      setInterimText("");
      setError(null);
      recognitionRef.current = recognition;
      wantListeningRef.current = true;
      try {
        recognition.start();
        setListening(true);
        setStartedAt(Date.now());
      } catch {
        detach(recognition);
        recognitionRef.current = null;
        wantListeningRef.current = false;
        setError("default");
      }
    },
    [createRecognition],
  );

  const stop = useCallback((): Promise<string> => {
    wantListeningRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition) return Promise.resolve(joinParts(committedRef.current));
    return new Promise<string>((resolve) => {
      resolversRef.current.push(resolve);
      if (restartTimerRef.current) {
        finalize(); // between two sessions: nothing pending
        return;
      }
      try {
        recognition.stop(); // onend → finalize, after the last results arrive
      } catch {
        finalize();
        return;
      }
      stopTimerRef.current = setTimeout(finalize, STOP_TIMEOUT_MS);
    });
  }, [finalize]);

  const abort = useCallback(() => {
    wantListeningRef.current = false;
    clearTimers();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      detach(recognition);
      try {
        recognition.abort();
      } catch {
        // Already stopped.
      }
    }
    sessionFinalRef.current = "";
    interimRef.current = "";
    setInterimText("");
    setListening(false);
    setStartedAt(null);
    const text = joinParts(committedRef.current);
    const resolvers = resolversRef.current;
    resolversRef.current = [];
    resolvers.forEach((resolve) => resolve(text));
  }, [clearTimers]);

  const reset = useCallback(() => {
    abort();
    committedRef.current = [];
    setFinalText("");
    setError(null);
  }, [abort]);

  // Release the microphone if the component unmounts mid-answer.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        detach(recognition);
        try {
          recognition.abort();
        } catch {
          // Already stopped.
        }
      }
    };
  }, []);

  return {
    supported,
    listening,
    finalText,
    interimText,
    error,
    startedAt,
    start,
    stop,
    abort,
    reset,
  };
}
