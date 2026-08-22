/**
 * Shared difficulty → badge-color mapping for journey / learning-path
 * difficulty badges (/journeys, /journey/:id, AI learning-path cards).
 *
 * The design system forbids raw Tailwind palette classes
 * (.agents/skills/verify-design-system/SKILL.md stage 5), so these map onto
 * the global DS status constants instead:
 *
 * DS-OK: global status constants #34d08c (ok) / #ffb84d (warn) / #ff5c7a (bad)
 * — semantics, not theme (SKILL.md stage 5 "Acceptable hardcoded values").
 */
const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: "bg-[#34d08c]/10 text-[#34d08c] border-[#34d08c]/30", // DS-OK: status ok
  intermediate: "bg-[#ffb84d]/10 text-[#ffb84d] border-[#ffb84d]/30", // DS-OK: status warn
  advanced: "bg-[#ff5c7a]/10 text-[#ff5c7a] border-[#ff5c7a]/30", // DS-OK: status bad
};

export function getDifficultyColor(difficulty: string): string {
  return DIFFICULTY_COLOR[difficulty] ?? "bg-muted text-muted-foreground";
}
