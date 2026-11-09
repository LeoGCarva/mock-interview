"use client";

import { useSyncExternalStore } from "react";
import { detectDefaultLanguage, type Language } from "@/lib/i18n";

const subscribeNever = () => () => {};

/**
 * Reads a browser-only value without a hydration mismatch: the server (and the
 * first client render) use `serverValue`, then React switches to the real value.
 * `read` must return a primitive or a stable reference.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribeNever, read, () => serverValue);
}

export function useBrowserLanguage(): Language {
  return useClientValue(detectDefaultLanguage, "en-US");
}

const alwaysTrue = () => true;

/** False during server rendering and hydration, true afterwards. */
export function useIsClient(): boolean {
  return useClientValue(alwaysTrue, false);
}
