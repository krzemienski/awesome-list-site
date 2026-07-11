# BUG-098 — /journey/N pages cite "Learning Path" with section titles but no step renderer (no actual interactive journey UI)

**Severity:** MEDIUM
**Affected page:** /journey/{6..10}

## Reproduction
The page emits 7 <h2> headings ("Learning Path", "Introduction to Video
Streaming", "Understanding Video Codecs", …) but no step renderer.
A "learning journey" needs progress tracking, marks a step complete,
moves to the next; today it's a static outline.

## Expected
Interactive path with step navigation (Next/Prev) and progress.

## Actual
A rendered outline only — the H2s are not interactive.

## Evidence
- `another-round.json`, `journey6`, `journey7`

## Fix prompt

```
Task: /journey/<n> pages on https://awesome.video/ render 7 H2
section headings ("Learning Path", "Introduction to Video
Streaming", …) but no interactive step renderer.

Acceptance:
1. Each H2 has an associated "Mark step as done" toggle.
2. A progress indicator shows N of M steps completed.
3. The Next/Prev arrow nav between sections is enabled.
```
