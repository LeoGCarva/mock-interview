import { describe, expect, it } from "vitest";
import { chooseVoice, voicesForLanguage, type VoiceLike } from "../src/lib/voices";

const voice = (name: string, lang: string, localService = true): VoiceLike => ({
  name,
  lang,
  voiceURI: name,
  localService,
});

const voices = [
  voice("Microsoft David", "en-US"),
  voice("Microsoft Aria Online (Natural)", "en-US", false),
  voice("Google português do Brasil", "pt-BR", false),
  voice("Microsoft Duarte", "pt-PT"),
];

describe("voices", () => {
  it("prefers natural/online voices for the language", () => {
    expect(chooseVoice(voices, "en-US")?.name).toBe("Microsoft Aria Online (Natural)");
    expect(chooseVoice(voices, "pt-BR")?.name).toBe("Google português do Brasil");
  });

  it("honours an explicit choice", () => {
    expect(chooseVoice(voices, "en-US", "Microsoft David")?.name).toBe("Microsoft David");
  });

  it("falls back to the same language in another region", () => {
    const onlyPortugal = [voice("Microsoft Duarte", "pt-PT")];
    expect(voicesForLanguage(onlyPortugal, "pt-BR").map((v) => v.name)).toEqual([
      "Microsoft Duarte",
    ]);
  });

  it("returns null when nothing matches", () => {
    expect(chooseVoice([voice("Microsoft Duarte", "pt-PT")], "en-US")).toBeNull();
  });
});
