/**
 * Splits streamed text into speakable chunks so text-to-speech can start
 * before the whole reply has arrived. Short sentences are merged with the next
 * one, and periods after common abbreviations or initials don't end a chunk.
 */

export const MIN_CHUNK_LENGTH = 20;

const ABBREVIATIONS = new Set([
  // English
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e",
  "approx", "dept", "inc", "ltd", "co", "no",
  // Portuguese
  "sra", "srta", "dra", "profa", "av", "pág", "nº", "ex", "obs", "aprox",
]);

// Sentence-ending punctuation (+ optional closing quotes/brackets) followed by
// whitespace, or a line break. Requiring whitespace keeps "3.5" or "Node.js" intact.
const BOUNDARY = /([.!?…]+)(["'”’)\]]*)\s+|\n+/g;

function endsWithAbbreviation(textBeforePeriod: string): boolean {
  const match = /(\S+)$/.exec(textBeforePeriod);
  if (!match) return false;
  const word = match[1].replace(/^[("'“‘[]+/, "").toLowerCase();
  if (/^\p{L}$/u.test(word)) return true; // initials such as "J. Smith"
  return ABBREVIATIONS.has(word);
}

export function extractSentences(
  text: string,
  minLength: number = MIN_CHUNK_LENGTH,
): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let chunkStart = 0;
  BOUNDARY.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BOUNDARY.exec(text)) !== null) {
    const end = match.index + match[0].length;
    if (match[1] === "." && endsWithAbbreviation(text.slice(chunkStart, match.index))) continue;
    const candidate = text.slice(chunkStart, end).trim();
    if (candidate.length < minLength) continue; // too short: merge with the next sentence
    sentences.push(candidate);
    chunkStart = end;
  }
  return { sentences, rest: text.slice(chunkStart) };
}

/** Splits a complete text into speakable chunks. */
export function splitIntoSentences(text: string, minLength: number = MIN_CHUNK_LENGTH): string[] {
  const { sentences, rest } = extractSentences(text, minLength);
  const last = rest.trim();
  return last ? [...sentences, last] : sentences;
}

export interface SentenceSplitter {
  push(delta: string): void;
  flush(): void;
}

/** Stateful wrapper for streaming: call `push` per delta and `flush` at the end. */
export function createSentenceSplitter(
  onSentence: (sentence: string) => void,
  minLength: number = MIN_CHUNK_LENGTH,
): SentenceSplitter {
  let buffer = "";
  return {
    push(delta) {
      buffer += delta;
      const { sentences, rest } = extractSentences(buffer, minLength);
      buffer = rest;
      sentences.forEach(onSentence);
    },
    flush() {
      const last = buffer.trim();
      buffer = "";
      if (last) onSentence(last);
    },
  };
}
