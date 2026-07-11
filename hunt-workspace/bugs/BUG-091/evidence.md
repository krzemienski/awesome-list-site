# BUG-091 — robots.txt has trailing whitespace + extra blank line at EOF

**Severity:** LOW (cosmetic)
**Affected endpoint:** /robots.txt

## Reproduction
```bash
curl -s https://awesome.video/robots.txt | xxd | tail -5
```
Returns a trailing blank line at EOF (a 0a after the last character).

## Expected
Trailing newline accepted, but no garbage whitespace or NUL bytes.

## Evidence
- raw `curl ... | xxd`

## Fix prompt (cosmetic, low-priority)
```
Task: /robots.txt has cosmetic formatting noise. Strip trailing
whitespace and ensure exactly one trailing newline.

Acceptance:
1. /robots.txt ends with a single \n.
2. Verifiable with curl + xxd.
```
