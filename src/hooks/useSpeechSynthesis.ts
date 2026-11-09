"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/i18n";
import { splitIntoSentences } from "@/lib/sentenceSplitter";
import { chooseVoice } from "@/lib/voices";
import { useClientValue } from "./useClientValue";

/*
 * STEP 3 — Text to voice, using the browser's speechSynthesis API.
 * Text is spoken sentence by sentence so speech can start while Gemini is
 * still streaming the rest of the reply.
 */

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function useSpeechSynthesisSupported(): boolean {
  return useClientValue(isSpeechSynthesisSupported, true);
}

// Voices load asynchronously ("voiceschanged"). getVoices() returns a new
// array on every call, so cache it to give React a stable snapshot.
const NO_VOICES: SpeechSynthesisVoice[] = [];
let voicesCache: SpeechSynthesisVoice[] = NO_VOICES;

function subscribeVoices(onChange: () => void) {
  if (!isSpeechSynthesisSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", onChange);
  return () => synth.removeEventListener("voiceschanged", onChange);
}

function getVoicesSnapshot(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return NO_VOICES;
  const next = window.speechSynthesis.getVoices();
  const unchanged =
    next.length === voicesCache.length &&
    next.every((voice, i) => voice.voiceURI === voicesCache[i]?.voiceURI);
  if (!unchanged) voicesCache = next;
  return voicesCache;
}

export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, getVoicesSnapshot, () => NO_VOICES);
}

/**
 * Call inside a click handler: browsers only allow speech after a user
 * gesture, and a silent utterance unlocks it for the rest of the session.
 */
export function primeSpeechSynthesis() {
  if (!isSpeechSynthesisSupported()) return;
  const utterance = new SpeechSynthesisUtterance(" ");
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
}

const IDLE_POLL_MS = 400;
const IDLE_TICKS_BEFORE_DONE = 3;

interface Options {
  language: Language;
  voiceURI?: string | null;
  muted?: boolean;
}

export interface SpeechSynthesisControls {
  supported: boolean;
  speaking: boolean;
  /** Queues one chunk of text (call once per sentence while streaming). */
  speak: (text: string) => void;
  /** Splits a full text into sentences and queues them. */
  speakText: (text: string) => void;
  /** Stops speaking and clears the queue. */
  cancel: () => void;
}

export function useSpeechSynthesis({ language, voiceURI = null, muted = false }: Options): SpeechSynthesisControls {
  const supported = useSpeechSynthesisSupported();
  const voices = useVoices();
  const voice = useMemo(() => chooseVoice(voices, language, voiceURI), [voices, language, voiceURI]);
  const [speaking, setSpeaking] = useState(false);

  // Latest options, read by the stable speak() callback.
  const optionsRef = useRef({ language, voice, muted });
  useEffect(() => {
    optionsRef.current = { language, voice, muted };
  }, [language, voice, muted]);

  const pendingRef = useRef(0);
  const generationRef = useRef(0);
  // Chrome can garbage-collect utterances before "end" fires; keep references.
  const activeRef = useRef(new Set<SpeechSynthesisUtterance>());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const markIdle = useCallback(() => {
    pendingRef.current = 0;
    activeRef.current.clear();
    stopPolling();
    setSpeaking(false);
  }, [stopPolling]);

  // Fallback for browsers where "end" occasionally never fires.
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    let idleTicks = 0;
    pollRef.current = setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        idleTicks = 0;
        return;
      }
      idleTicks += 1;
      if (idleTicks >= IDLE_TICKS_BEFORE_DONE) markIdle();
    }, IDLE_POLL_MS);
  }, [markIdle]);

  const speak = useCallback(
    (text: string) => {
      const { language: lang, voice: selectedVoice, muted: isMuted } = optionsRef.current;
      if (!supported || isMuted || !text.trim()) return;
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      if (selectedVoice) utterance.voice = selectedVoice;

      const generation = generationRef.current;
      const done = () => {
        activeRef.current.delete(utterance);
        if (generation !== generationRef.current) return; // cancelled earlier
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (pendingRef.current === 0) {
          stopPolling();
          setSpeaking(false);
        }
      };
      utterance.onend = done;
      utterance.onerror = done;

      activeRef.current.add(utterance);
      pendingRef.current += 1;
      setSpeaking(true);
      if (synth.paused) synth.resume();
      synth.speak(utterance);
      startPolling();
    },
    [supported, startPolling, stopPolling],
  );

  const speakText = useCallback(
    (text: string) => {
      splitIntoSentences(text).forEach(speak);
    },
    [speak],
  );

  const cancel = useCallback(() => {
    generationRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
    markIdle();
  }, [supported, markIdle]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      if (pollRef.current) clearInterval(pollRef.current);
      if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
    };
  }, []);

  return { supported, speaking, speak, speakText, cancel };
}
