import { LockIcon } from "./icons";

interface LiveTranscriptProps {
  finalText: string;
  interimText: string;
  listening: boolean;
  label: string;
  readOnlyLabel: string;
  placeholder: string;
  elapsed?: string;
}

/**
 * STEP 1 output. Deliberately a plain <div>, not an input or textarea: the
 * candidate sees what was transcribed but cannot edit it.
 */
export function LiveTranscript({
  finalText,
  interimText,
  listening,
  label,
  readOnlyLabel,
  placeholder,
  elapsed,
}: LiveTranscriptProps) {
  const empty = !finalText && !interimText;
  return (
    <section
      aria-label={label}
      className={`rounded-2xl border bg-card transition-colors ${listening ? "border-accent" : "border-border"}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted">
        <span className="flex items-center gap-2 font-medium">
          {listening && <span className="size-2 animate-pulse rounded-full bg-danger" />}
          {label}
          {elapsed && <span className="tabular-nums">· {elapsed}</span>}
        </span>
        <span className="flex items-center gap-1">
          <LockIcon width={12} height={12} />
          {readOnlyLabel}
        </span>
      </header>
      <div
        aria-live="polite"
        aria-readonly="true"
        className="max-h-44 min-h-20 overflow-y-auto px-4 py-3 leading-relaxed whitespace-pre-wrap"
      >
        {empty ? (
          <span className="text-muted italic">{placeholder}</span>
        ) : (
          <>
            {finalText}
            {interimText && <span className="text-muted"> {interimText}</span>}
          </>
        )}
      </div>
    </section>
  );
}
