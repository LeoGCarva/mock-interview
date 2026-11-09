"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ChatTurn } from "@/lib/schemas";

interface ConversationViewProps {
  turns: readonly ChatTurn[];
  /** Interviewer text currently being streamed. */
  streamingText: string;
  /** Show the "interviewer is typing" indicator. */
  thinking: boolean;
  interviewerLabel: string;
  candidateLabel: string;
  /** The scrollable panel that contains this view. */
  scrollRef: RefObject<HTMLElement | null>;
}

/** Distance from the bottom (px) within which we keep following new text. */
const STICK_THRESHOLD = 80;

function Bubble({ turn, label, live }: { turn: ChatTurn; label: string; live?: boolean }) {
  const isInterviewer = turn.role === "assistant";
  return (
    <div className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isInterviewer ? "" : "text-right"}`}>
        <p className="mb-1 text-xs font-medium text-muted">{label}</p>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-left leading-relaxed ${
            isInterviewer
              ? "rounded-tl-sm border border-border bg-card"
              : "rounded-tr-sm bg-accent-soft text-foreground"
          }`}
        >
          {turn.content}
          {live && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />}
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only history of the interview. Scrolls only its own panel (never the
 * window) and follows new text only while the user is at the bottom.
 */
export function ConversationView({
  turns,
  streamingText,
  thinking,
  interviewerLabel,
  candidateLabel,
  scrollRef,
}: ConversationViewProps) {
  const stickToBottomRef = useRef(true);
  const lastTurnCountRef = useRef(turns.length);

  // Track whether the user is near the bottom of the panel.
  useEffect(() => {
    const panel = scrollRef.current;
    if (!panel) return;
    const onScroll = () => {
      const distance = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
      stickToBottomRef.current = distance <= STICK_THRESHOLD;
    };
    panel.addEventListener("scroll", onScroll, { passive: true });
    return () => panel.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // Follow new content: smooth once per new turn, instant while text streams.
  useEffect(() => {
    const panel = scrollRef.current;
    if (!panel) return;
    const newTurn = turns.length !== lastTurnCountRef.current;
    lastTurnCountRef.current = turns.length;
    if (!stickToBottomRef.current && !newTurn) return;
    if (newTurn) {
      stickToBottomRef.current = true;
      panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
    } else {
      panel.scrollTop = panel.scrollHeight;
    }
  }, [turns.length, streamingText, thinking, scrollRef]);

  return (
    <div className="space-y-5" aria-live="polite">
      {turns.map((turn, i) => (
        <Bubble
          key={i}
          turn={turn}
          label={turn.role === "assistant" ? interviewerLabel : candidateLabel}
        />
      ))}
      {streamingText && (
        <Bubble turn={{ role: "assistant", content: streamingText }} label={interviewerLabel} live />
      )}
      {thinking && !streamingText && (
        <div className="flex justify-start">
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-4">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="size-2 animate-bounce rounded-full bg-muted"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
