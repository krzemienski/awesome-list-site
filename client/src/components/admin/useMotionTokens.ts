import { useState } from "react";

export interface MotionTokens {
  /** Seconds, for framer-motion transitions. */
  fast: number;
  base: number;
  slow: number;
  ease: [number, number, number, number];
}

function seconds(raw: string): number | null {
  const m = /^\s*([\d.]+)\s*(ms|s)\s*$/.exec(raw);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "ms" ? n / 1000 : n;
}

function bezier(raw: string): MotionTokens["ease"] | null {
  const m = /cubic-bezier\(([^)]+)\)/.exec(raw);
  const parts = m?.[1].split(",").map(Number);
  return parts?.length === 4 && parts.every(Number.isFinite) ? (parts as MotionTokens["ease"]) : null;
}

/**
 * The design-system motion tokens (--motion-fast/base/slow, --motion-ease)
 * read from :root, so framer-motion transitions use the same durations and
 * easing as the CSS ones.
 */
export function useMotionTokens(): MotionTokens {
  const [tokens] = useState<MotionTokens>(() => {
    const css = getComputedStyle(document.documentElement);
    const read = (name: string) => seconds(css.getPropertyValue(name));
    const fast = read("--motion-fast");
    const base = read("--motion-base");
    const slow = read("--motion-slow");
    const ease = bezier(css.getPropertyValue("--motion-ease"));
    if (fast === null || base === null || slow === null || ease === null) {
      throw new Error("Design-system motion tokens (--motion-fast/base/slow, --motion-ease) are missing from :root");
    }
    return { fast, base, slow, ease };
  });
  return tokens;
}
