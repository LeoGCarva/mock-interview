import type { Language } from "./i18n";

/** Minimal shape we need from SpeechSynthesisVoice (keeps helpers testable). */
export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

const normalize = (lang: string) => lang.toLowerCase().replace("_", "-");

function voiceScore(voice: VoiceLike): number {
  let score = 0;
  if (/natural|neural/i.test(voice.name)) score += 4;
  if (/online/i.test(voice.name)) score += 2;
  if (/google/i.test(voice.name)) score += 2;
  if (!voice.localService) score += 1;
  return score;
}

/**
 * Voices for a language, best first. Exact locale matches (pt-BR) come before
 * same-language matches (pt-PT) only when no exact match exists.
 */
export function voicesForLanguage<V extends VoiceLike>(voices: readonly V[], language: Language): V[] {
  const target = normalize(language);
  const prefix = target.slice(0, 2);
  const exact = voices.filter((v) => normalize(v.lang) === target);
  const pool = exact.length > 0 ? exact : voices.filter((v) => normalize(v.lang).startsWith(prefix));
  return [...pool].sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

export function chooseVoice<V extends VoiceLike>(
  voices: readonly V[],
  language: Language,
  preferredVoiceURI?: string | null,
): V | null {
  if (preferredVoiceURI) {
    const preferred = voices.find((v) => v.voiceURI === preferredVoiceURI);
    if (preferred) return preferred;
  }
  return voicesForLanguage(voices, language)[0] ?? null;
}
