import { describe, expect, it } from "vitest";
import { createNdjsonParser, encodeEvent, type StreamEvent } from "../src/lib/ndjson";

describe("NDJSON", () => {
  it("parses events split across chunks", () => {
    const events: StreamEvent[] = [];
    const parser = createNdjsonParser((e) => events.push(e));
    const wire =
      encodeEvent({ type: "text", text: "Hello " }) +
      encodeEvent({ type: "text", text: "world\n with newline" }) +
      encodeEvent({ type: "done" });
    for (let i = 0; i < wire.length; i += 7) parser.push(wire.slice(i, i + 7));
    parser.flush();
    expect(events).toEqual([
      { type: "text", text: "Hello " },
      { type: "text", text: "world\n with newline" },
      { type: "done" },
    ]);
  });

  it("flushes a final line without a trailing newline", () => {
    const events: StreamEvent[] = [];
    const parser = createNdjsonParser((e) => events.push(e));
    parser.push(JSON.stringify({ type: "error", code: "rate_limit", message: "slow down" }));
    expect(events).toEqual([]);
    parser.flush();
    expect(events).toEqual([{ type: "error", code: "rate_limit", message: "slow down" }]);
  });
});
