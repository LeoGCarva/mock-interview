import type { ApiErrorCode } from "./schemas";

/** Events streamed by POST /api/interview, one JSON object per line. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; code: ApiErrorCode; message: string };

export function encodeEvent(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Incremental NDJSON parser: feed it arbitrary text chunks (lines may be split
 * across chunks) and it calls `onEvent` once per complete line.
 */
export function createNdjsonParser(onEvent: (event: StreamEvent) => void) {
  let buffer = "";

  const emit = (line: string) => {
    const trimmed = line.trim();
    if (trimmed) onEvent(JSON.parse(trimmed) as StreamEvent);
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        emit(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    },
    flush() {
      const rest = buffer;
      buffer = "";
      emit(rest);
    },
  };
}
