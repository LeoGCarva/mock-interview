"use client";

import { useId, useMemo, useState } from "react";
import { useSpeechRecognitionSupported } from "@/hooks/useSpeechRecognition";
import {
  primeSpeechSynthesis,
  useSpeechSynthesis,
  useSpeechSynthesisSupported,
  useVoices,
} from "@/hooks/useSpeechSynthesis";
import {
  DEFAULT_QUESTION_COUNT,
  LANGUAGES,
  LANGUAGE_LABELS,
  QUESTION_COUNTS,
  getMessages,
  type Language,
  type QuestionCount,
} from "@/lib/i18n";
import type { InterviewSettings } from "@/lib/interview";
import { LIMITS } from "@/lib/schemas";
import { voicesForLanguage } from "@/lib/voices";
import { MicIcon, VolumeIcon } from "./icons";
import { Button, Notice, Spinner } from "./ui";

interface SetupFormProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  initial: InterviewSettings | null;
  onStart: (settings: InterviewSettings) => void;
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? "border-accent bg-accent-soft font-medium text-accent-strong"
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SetupForm({ language, onLanguageChange, initial, onStart }: SetupFormProps) {
  const t = getMessages(language);
  const jobId = useId();
  const voiceId = useId();

  const sttSupported = useSpeechRecognitionSupported();
  const ttsSupported = useSpeechSynthesisSupported();
  const voices = useVoices();

  const [jobDescription, setJobDescription] = useState(initial?.jobDescription ?? "");
  const [totalQuestions, setTotalQuestions] = useState<QuestionCount>(
    initial?.totalQuestions ?? DEFAULT_QUESTION_COUNT,
  );
  // A voice choice only applies to the language it was picked for.
  const [voiceChoice, setVoiceChoice] = useState<{ language: Language; uri: string } | null>(
    initial?.voiceURI ? { language: initial.language, uri: initial.voiceURI } : null,
  );
  const voiceURI = voiceChoice?.language === language ? voiceChoice.uri : "";
  const [checkingMic, setCheckingMic] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  const languageVoices = useMemo(() => voicesForLanguage(voices, language), [voices, language]);
  const tts = useSpeechSynthesis({ language, voiceURI: voiceURI || null });

  const jobLength = jobDescription.trim().length;
  const jobValid = jobLength >= LIMITS.jobDescriptionMin && jobLength <= LIMITS.jobDescriptionMax;
  const canStart = jobValid && sttSupported && !checkingMic;

  function handleTestVoice() {
    tts.cancel();
    tts.speakText(t.voiceTestPhrase);
  }

  async function handleStart() {
    if (!canStart) return;
    tts.cancel();
    primeSpeechSynthesis(); // must run inside the click to unlock speech
    setMicDenied(false);
    setCheckingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setMicDenied(true);
      setCheckingMic(false);
      return;
    }
    setCheckingMic(false);
    onStart({
      jobDescription: jobDescription.trim(),
      language,
      totalQuestions,
      voiceURI: voiceURI || null,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
          <MicIcon width={14} height={14} /> Voice · Gemini
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.appTitle}</h1>
        <p className="mt-2 max-w-xl text-muted">{t.appSubtitle}</p>
      </header>

      <section aria-label={t.howItWorks} className="mb-8 grid gap-3 sm:grid-cols-3">
        {t.steps.map((step, i) => (
          <div key={step.title} className="rounded-2xl border border-border bg-card p-4">
            <span className="mb-2 inline-flex size-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong">
              {i + 1}
            </span>
            <h2 className="font-medium">{step.title}</h2>
            <p className="mt-1 text-sm text-muted">{step.body}</p>
          </div>
        ))}
      </section>

      <form
        className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          void handleStart();
        }}
      >
        {!sttSupported && <Notice tone="danger">{t.unsupportedStt}</Notice>}
        {sttSupported && !ttsSupported && <Notice>{t.unsupportedTts}</Notice>}

        <div>
          <label htmlFor={jobId} className="mb-2 block text-sm font-medium">
            {t.jobDescriptionLabel}
          </label>
          <textarea
            id={jobId}
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder={t.jobDescriptionPlaceholder}
            maxLength={LIMITS.jobDescriptionMax}
            rows={9}
            className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <p className={`mt-1 text-xs ${jobValid || jobLength === 0 ? "text-muted" : "text-warning"}`}>
            {t.jobDescriptionCount(jobLength, LIMITS.jobDescriptionMin, LIMITS.jobDescriptionMax)}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Segmented
            label={t.languageLabel}
            options={LANGUAGES}
            value={language}
            onChange={onLanguageChange}
            format={(l) => LANGUAGE_LABELS[l]}
          />
          <Segmented
            label={t.questionsLabel}
            options={QUESTION_COUNTS}
            value={totalQuestions}
            onChange={setTotalQuestions}
            format={(n) => String(n)}
          />
        </div>

        {ttsSupported && (
          <div>
            <label htmlFor={voiceId} className="mb-2 block text-sm font-medium">
              {t.voiceLabel}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                id={voiceId}
                value={voiceURI}
                onChange={(event) =>
                  setVoiceChoice(event.target.value ? { language, uri: event.target.value } : null)
                }
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">{t.voiceAuto}</option>
                {languageVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <Button onClick={handleTestVoice} disabled={tts.speaking}>
                <VolumeIcon width={16} height={16} />
                {t.testVoice}
              </Button>
            </div>
            {voices.length > 0 && languageVoices.length === 0 && (
              <p className="mt-1 text-xs text-warning">{t.noVoices}</p>
            )}
          </div>
        )}

        {micDenied && <Notice tone="danger">{t.micDenied}</Notice>}

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs text-muted">{t.privacyNote}</p>
          <Button type="submit" variant="primary" disabled={!canStart} className="px-6 py-2.5">
            {checkingMic ? <Spinner className="size-4" /> : <MicIcon width={16} height={16} />}
            {checkingMic ? t.checkingMic : t.startInterview}
          </Button>
        </div>
      </form>
    </div>
  );
}
