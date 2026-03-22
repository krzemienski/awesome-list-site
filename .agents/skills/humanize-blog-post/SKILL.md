---
name: humanize-blog-post
description: |
  Rewrite AI-generated blog posts to sound authentically human. Eliminates LLM tells (formulaic transitions, hedging, uniform sentence structure, corporate buzzwords) and replaces them with conversational developer voice — contractions, varied rhythm, admitted uncertainty, real code examples, and personality. Use when blog posts sound robotic, when content reads like ChatGPT wrote it, when user says "make it sound human", "sounds like AI", "too formal", "rewrite in my voice", or when auditing technical content for authenticity. Also use proactively after any blog post generation to ensure human voice quality.
---

# Humanize Blog Post

Rewrite AI-generated technical blog posts into authentic developer voice. Every output should read like a real person explaining something they built, struggled with, and learned from.

## Why This Skill Exists

LLMs produce text with detectable statistical signatures: low perplexity (too predictable), low burstiness (uniform sentence length), formulaic transitions, and hedging language. Human readers detect AI writing with ~99.7% accuracy. This skill systematically eliminates those patterns while preserving technical accuracy and code examples.

## Process

### Step 1: Scan for AI Patterns (Baseline)

Run the pattern scanner on the input post:

```bash
python /Users/nick/.claude/plugins/cache/aiwg/writing/1.0.0/skills/ai-pattern-detection/scripts/pattern_scanner.py "<post_file_path>"
```

Record the baseline score. Posts scoring below 70 (grades D-F) need heavy rewriting. Posts scoring 70-85 (C-B) need targeted fixes. Posts above 85 (A) need only light polish.

If the scanner is unavailable, manually audit against the detection categories in `references/ai-tells-checklist.md`.

### Step 2: Read the Post Fully

Read the entire post. Identify:
- **Frontmatter** — preserve exactly (YAML between `---` markers)
- **Code blocks** — preserve exactly (content inside triple backticks)
- **Mermaid diagrams** — preserve exactly (```mermaid blocks)
- **Data/metrics** — preserve numbers, percentages, session counts
- **GitHub repo references** — preserve URLs and repo names
- **Prose sections** — these are what you rewrite

### Step 3: Apply Rewriting Rules

Read `references/rewriting-rules.md` for the complete ruleset. The critical rules:

**KILL LIST — Remove or replace every instance:**

| AI Pattern | Replace With |
|-----------|-------------|
| Moreover, Furthermore, Additionally | Just start the next sentence |
| It is worth noting that | Cut entirely |
| In conclusion, To summarize | Cut entirely |
| In the world of, In today's landscape | Cut entirely |
| plays a crucial role | "handles" / "does" |
| seamlessly integrates | "works with" / "connects to" |
| cutting-edge, next-generation | "new" / "recent" / specific name |
| robust, comprehensive, holistic | specific description of what it does |
| leverage | "use" |
| delve, tapestry, landscape (metaphorical) | cut or use plain language |
| navigate (metaphorical) | cut or use "work through" |
| foster, catalyze, amplify, unlock | plain verbs |
| paradigm, ecosystem, synergize | cut |

**STRUCTURAL FIXES:**

1. **Sentence length variation** — Mix 4-word punches ("It broke.") with 30+ word explanations. If 5 consecutive sentences are 14-18 words, break the pattern.

2. **Paragraph length variation** — Single-sentence paragraphs for emphasis. 4-5 sentence paragraphs for explanation. Never more than 3 paragraphs of similar length in a row.

3. **Break parallelism** — If you see "X provides A, maintains B, and ensures C" followed by another triple, rewrite one of them differently.

4. **Contractions everywhere** — "I am" → "I'm", "it is" → "it's", "do not" → "don't", "you will" → "you'll". Use contractions naturally throughout.

5. **First person** — "I built", "I discovered", "I broke", "I learned". Not "one might observe" or "the developer would."

6. **Kill hedging** — "may potentially offer" → "offers". "could be considered" → "is". "might prove beneficial" → "helps". Only hedge when genuinely uncertain.

7. **Questions to reader** — At least 3-5 per 2000-word post. "Ever hit this?" "Sound familiar?" "What happens when..."

8. **Show before tell** — Code block or terminal output FIRST, then explain what it does. Not the reverse.

### Step 4: Add Authentic Roughness

These techniques make writing feel real. Use at least 3 per post:

**Self-correction (metanoia):**
> "I thought this was a caching issue — actually, it was the connection pool timing out under load."

**Admitted uncertainty:**
> "I'm still not sure why this specific combination triggers it. My best guess is..."

**Conversational asides:**
> "Redis keys expire automatically — which, honestly, saved me hours of debugging when I first learned it."

**Direct reader address:**
> "If you've tried this and hit the same wall, here's what actually worked."

**Real failures shown:**
> Include actual error messages, wrong approaches tried, time wasted.

**Opinion with spine:**
> "Unit tests for this are a waste of time. Here's why." Not "Some developers might find that unit tests are less effective in certain scenarios."

### Step 5: Voice Calibration

The target voice is a senior developer explaining at a whiteboard:
- Confident but honest about gaps
- Uses jargon naturally (doesn't define `git rebase` for a dev audience)
- Drops in specific numbers ("took 4 hours", "across 929 sessions")
- Admits mistakes and wrong turns
- Occasionally funny in a dry, self-deprecating way
- Short sentences for impact. Longer ones for technical explanation.
- Fragments are fine. Like this.

Read `references/voice-tone.md` for the full voice guide with examples.

### Step 6: Preserve Technical Integrity

While rewriting prose, NEVER modify:
- Code blocks (content between triple backticks)
- Mermaid diagram syntax
- YAML frontmatter
- Exact metrics, session counts, file counts
- GitHub URLs and repo references
- File paths and function names
- Direct quotes from terminal output

If a code block is preceded by an AI-sounding introduction ("The following code snippet demonstrates the implementation of..."), replace just the introduction ("Here's the actual gate check:").

### Step 7: Re-scan and Verify

Run the pattern scanner again on the rewritten post:

```bash
python /Users/nick/.claude/plugins/cache/aiwg/writing/1.0.0/skills/ai-pattern-detection/scripts/pattern_scanner.py "<rewritten_post_path>"
```

**Target:** Score 80+ (grade B or above). If below 80, identify remaining AI patterns and fix them.

**Manual verification checklist:**
- [ ] No formal transitions (Moreover, Furthermore, Additionally)
- [ ] Contractions used naturally throughout
- [ ] Sentence lengths vary (check: read 5 consecutive sentences, are they all similar length?)
- [ ] At least 3 questions to reader
- [ ] At least 1 admitted uncertainty or self-correction
- [ ] First person used naturally
- [ ] No hedging language (may, might, could, potentially)
- [ ] Code shown before explained (at least in key sections)
- [ ] Opening is NOT a definition or "In this article we will..."
- [ ] Closing is NOT "In conclusion..." or "To summarize..."

## Output Format

The rewritten post replaces the original file at the same path. Preserve the exact file structure:
- YAML frontmatter (unchanged)
- Markdown content (rewritten)
- Code blocks (unchanged)
- Mermaid diagrams (unchanged)

## Red Flags — STOP and Fix

If you catch yourself writing any of these, you're slipping back into AI voice:

- "It's worth noting that" — just say the thing
- "This approach offers several advantages" — name the advantages directly
- Starting 3+ paragraphs the same way
- A paragraph that's pure explanation with no code, no example, no question
- "Comprehensive," "robust," "scalable" without specific numbers
- Perfect parallelism in consecutive sentences
- Any sentence you wouldn't say out loud to a colleague

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The formal version is clearer" | It's not — it's just more familiar to LLMs. Conversational is clearer for humans. |
| "Technical writing should be formal" | Read Julia Evans, Paul Graham, or the Stripe blog. The best tech writing is conversational. |
| "I need transitions for flow" | Human writers use implied connections. "Moreover" is a crutch, not a bridge. |
| "Hedging is more accurate" | Hedging is risk-averse. If you're not sure, say "I'm not sure" — that's more honest than "it may potentially..." |
| "This post doesn't need personality" | Every post needs personality. Personality is what separates content from documentation. |

## References

| File | Purpose | When to Read |
|------|---------|--------------|
| `references/rewriting-rules.md` | Complete AI-tell word lists, structural patterns, replacement tables | Before every rewrite |
| `references/voice-tone.md` | Target voice characteristics with examples | Before first rewrite of session |
| `references/ai-tells-checklist.md` | Quick-reference audit checklist | During Step 7 verification |

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Rewriting code blocks or YAML frontmatter | Destroys technical accuracy; code must be preserved exactly | Only rewrite prose sections — preserve code, frontmatter, mermaid, metrics, URLs |
| Replacing all hedging with absolute statements | Some uncertainty is genuine and honest — "I'm not sure" is human | Only kill empty hedging ("may potentially offer"); keep genuine uncertainty ("I think this is because...") |
| Making every sentence short and punchy | Uniform short sentences sound like a telegram, not a person | Mix 4-word punches with 30+ word explanations; vary rhythm deliberately |
| Running the rewrite without scanning first | You don't know what to fix if you haven't measured the baseline | Always run pattern scanner (Step 1) before rewriting |
| Skipping the re-scan after rewriting | You may have introduced new AI patterns while fixing old ones | Always re-scan (Step 7) and verify score improved to 80+ |

## When NOT to Use

- Technical documentation or API references (formal tone is appropriate)
- Content the user explicitly wants in formal/academic voice
- Non-blog formats: changelogs, commit messages, README files
- Content that hasn't been generated by AI (don't "fix" already-human writing)

## Conflicts

- `copywriting` — Both handle writing voice. Use humanize-blog-post specifically for AI-to-human rewrites. Use copywriting for brand voice extraction and style-matched writing from scratch.
- `blog-post-writer` — Overlapping blog post concern. Use blog-post-writer for initial structure and narrative. Use humanize-blog-post as a post-processing pass to eliminate AI tells.

## Related Skills

- `ai-pattern-detection` — automated scanning for AI patterns (provides the scanner script)
- `blog-post-writer` — narrative structure and voice guidance for blog posts
- `technical-content-creator` — full blog post workflow with visual assets
- `elements-of-style:writing-clearly-and-concisely` — Strunk's rules for concise writing
- `copywriting` — style extraction and conversion formulas
