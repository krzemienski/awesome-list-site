---
name: Drift-gate mutation probing
description: How to prove a source-mirror drift gate really fails, and the literal-comparison trap that exposes
---

# Drift-gate mutation probing

A new or newly extended drift gate (the scripts/validation/*-drift family, which compares hand-copied mirrors of one registry across several files) is NOT verified by passing on the current tree. Copy the gate plus every file it reads into a scratch tree under /tmp, apply ONE mutation at a time, and assert both the exit code and the exact set of failure kinds.

**Why:** an extension can pass clean on the real tree and still be wrong in both directions — missing real drift, or inventing it. A quote-escaped font stack false-failed a stack comparison and only mutation probing surfaced it. Mutating the real client/ files instead would also trip the vite watcher and reload any live browser session mid-run.

Two things the probes teach that reasoning about the code does not:

- **Parser-rot short-circuits the comparison it feeds.** When a parser finds nothing, the parity check downstream is skipped, so renaming an array yields parser-rot ALONE — not parser-rot plus a parity failure. Expect that shape when writing the expectations, or the harness reports false BADs.
- **Compare decoded values, not source spelling.** A string literal lifted out of source still carries its backslash escapes, so a stack written with escaped quotes never equals the same stack written with the other quote character until it is unescaped. Any gate comparing literals across two files must unescape first, then normalize only what the consumer genuinely ignores (for CSS font stacks: quote character, whitespace, comma spacing, case — never family order).

**How to apply:** whenever adding or extending a validation gate that compares duplicated literals across files. Include a no-op mutation (a cosmetic rewrite that must still PASS) alongside the failing ones — a gate that fails on everything is as useless as one that fails on nothing.
