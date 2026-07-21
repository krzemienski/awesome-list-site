---
name: LLM JSON output hygiene
description: Requesting JSON from Claude — token cap truncation silently breaks parsing; extraction and cap rules.
---

Any code path that asks Claude for a JSON object and `JSON.parse`s the reply needs three defenses, or it fails silently (caught error → fallback path → nobody notices):

1. **Generous max_tokens.** A 2,000-token cap truncated the learning-path JSON mid-string on EVERY call for months — the feature "worked" only because the template fallback masked it. Verbose models blow past small caps; give ~2x headroom and tell the model to keep descriptions short.
2. **Outermost-brace extraction.** Strip ```json fences AND slice from the first `{` to the last `}` — models occasionally append trailing commentary after valid JSON.
3. **Watch the logs for parse errors.** "Error generating AI path: SyntaxError" in server logs is the only symptom; the HTTP response still 200s with fallback content. If a generationType/source field exists in the payload, assert it equals 'ai' when validating.

**Why:** silent fallback made a permanently-broken AI feature look healthy through a full functional audit; only the boot warm-up logs exposed it.

**How to apply:** any new claudeService.generateResponse call expecting JSON; when validating AI features, check the *generation type* of the output, not just the status code.
