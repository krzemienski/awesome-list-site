---
name: technical-content-creator
description: |
  Create publication-ready technical blog posts, tutorials, and developer content with Claude-generated visual assets.
  Use when: writing tech blogs, developer tutorials, architecture writeups, performance reports, release notes, or generating Mermaid diagrams, SVG charts, HTML hero images, social cards for technical content.
  Covers: 6 content workflows (blog post, tutorial, visuals-only, architecture, performance report, release notes), Mermaid/SVG/HTML visual generation, post type patterns, writing rules, distribution checklist.
  Keywords: technical blog, developer tutorial, Mermaid diagram, SVG chart, hero image, social card, engineering post, devlog
---

<essential_principles>

This skill produces developer-focused technical content with Claude-generated visual assets. No external image services, no third-party APIs — every visual is generated directly by Claude as Mermaid, SVG, or self-contained HTML.

**Write for developers who build things.** Every post assumes the reader can code. Skip beginner explanations of common tools. Go deep on the non-obvious parts. Show the end result first, then explain how you got there.

**Visuals are not decorations — they are explanations.** Every diagram, chart, and image must convey information that text alone cannot. Architecture diagrams show relationships. Performance charts prove claims. Hero images signal topic and quality. If a visual doesn't teach something, cut it.

**Claude generates all visuals natively:**
- **Mermaid diagrams** — Flowcharts, sequence diagrams, architecture maps, state machines, ER diagrams, C4 models, Gantt charts. Validated against known-correct syntax.
- **SVG charts** — Bar charts, line charts, comparison charts, metric cards. Hand-crafted SVG with professional color palette, proper axes, labels, responsive sizing.
- **HTML+CSS visual cards** — Hero images, social media cards (Twitter 1200x628, LinkedIn 1200x627), code snippet cards, metric highlight cards. Self-contained HTML with inline CSS, zero external dependencies, screenshot-ready.

**Show real code, real output, real results.** Every code block must be copy-paste runnable. Include actual terminal output. If something failed, show the error and the fix. Fabricated examples destroy credibility.

**Structure for scanning, depth for learning.** Lead with the result. Use clear section headers. Put "why should I care" before "how it works." When you go deep, go ALL the way deep — no hand-waving.

**One post, one core insight.** Every piece of content has exactly one central takeaway. Everything else supports it. Three insights = three posts.

</essential_principles>

<intake>
What would you like to create?

1. **Full Blog Post** — Complete technical blog post with hero image, inline diagrams, charts, and social distribution assets
2. **Tutorial / How-To** — Step-by-step guide with prerequisites, runnable code, and visual aids
3. **Visual Assets Only** — Generate Mermaid diagrams, SVG charts, HTML hero images, or social cards for existing content
4. **Architecture Writeup** — System design post with C4/architecture diagrams and performance data
5. **Performance / Benchmark Report** — Data-driven post with charts, comparisons, and methodology
6. **Release Notes / Changelog** — Structured release communication with visual diff summaries

Provide the **topic**, **target audience**, and any **existing content** (code snippets, data, session logs) to incorporate.

**Wait for response before proceeding.**
</intake>

<routing>
| Response | Workflow |
|----------|---------|
| 1, "blog", "post", "write" | workflows/full-blog-post.md |
| 2, "tutorial", "how-to", "guide", "step by step" | workflows/tutorial-guide.md |
| 3, "visual", "diagram", "chart", "image", "card", "hero" | workflows/generate-visuals.md |
| 4, "architecture", "system design", "C4" | workflows/architecture-writeup.md |
| 5, "performance", "benchmark", "metrics", "report" | workflows/performance-report.md |
| 6, "release", "changelog", "notes" | workflows/release-notes.md |

**Default parameters:**
- Blog length: 1,500–2,500 words
- Code blocks: Copy-paste runnable with language tags
- Visuals per post: Hero image + minimum 2 inline (diagram/chart)
- Social assets: Twitter card + LinkedIn card
- Mermaid theme: default (dark backgrounds for code-heavy posts)
- SVG palette: #1e40af, #059669, #6366f1, #f59e0b, #ef4444
- HTML cards: Dark theme, responsive, zero external deps

**After reading the workflow, follow it exactly.**
</routing>

<visual_generation_system>

Claude generates all visuals directly. Three output formats:

**1. Mermaid Diagrams (.mermaid files)**
Use for: Architecture, workflows, sequences, state machines, ERDs, C4, class diagrams, Gantt.
Read references/mermaid-patterns.md for validated syntax BEFORE generating ANY Mermaid.
Always validate: no nested quotes, no unescaped special chars, proper node IDs (alphanumeric, no spaces).

**2. SVG Charts (.svg files)**
Use for: Performance comparisons, benchmarks, time-series, metric dashboards, before/after.
Read references/svg-components.md for chart building blocks.
Always include: axes with labels, data labels on bars/points, legend if multi-series, responsive viewBox.

**3. HTML+CSS Cards (.html files)**
Use for: Hero images, social media cards, code snippet cards, metric highlights, infographics.
Read references/html-visual-templates.md for base templates.
Always: inline all CSS, use system fonts only, set exact pixel dimensions for social, make screenshot-ready.

**Visual selection guide:**
| Content Type | Required Visuals |
|---|---|
| Architecture post | Mermaid C4/flowchart + HTML hero |
| Tutorial | Mermaid workflow diagram + HTML hero |
| Performance report | SVG bar/line charts + Mermaid before/after + HTML hero |
| How-to guide | Mermaid step flowchart + HTML hero |
| Debug war story | Mermaid sequence diagram + SVG timeline + HTML hero |
| Release notes | Mermaid diff diagram + HTML hero |

</visual_generation_system>

<post_type_patterns>

**Tutorial / How-To:**
1. What you'll build (show output FIRST)
2. Prerequisites (exact versions, install commands)
3. Step-by-step implementation (runnable code each step)
4. Common errors and fixes
5. Complete code link
6. What to try next

**Deep Dive / Explainer:**
1. The problem (relatable dev scenario)
2. Why existing approaches fall short
3. The technique (with diagrams)
4. Implementation (real code)
5. Results and tradeoffs
6. When NOT to use this

**War Story / Debugging:**
1. The symptom (what went wrong)
2. First attempts (what didn't work and why)
3. The investigation (sequence diagram)
4. The root cause (surprise element)
5. The fix (before/after code)
6. Lessons and prevention

**Benchmark / Performance:**
1. Headline result (chart showing improvement)
2. Methodology (reproducible setup)
3. Raw data (tables + charts)
4. Analysis (why these results)
5. Caveats and limitations
6. Reproduction instructions

</post_type_patterns>

<writing_rules>

1. **Show the end result first.** Before explaining how, show what the reader achieves.
2. **Every code block gets a language tag.** python, bash, yaml, json, typescript — always.
3. **Real terminal output after code blocks.** Show what actually happens when you run it.
4. **Explain the WHY, not just the WHAT.** "Connection pooling" → "because each new connection costs 30ms TLS overhead, at 500 req/s that's 15s of waste per second."
5. **Link to complete code.** Never leave the reader with incomplete implementations.
6. **H2 for sections, H3 sparingly.** Never H4+. If you need H4, restructure.
7. **Error handling is content.** Show try/except. Show what happens when the API is down.
8. **Prerequisites are exact.** Not "Python 3.x" but "Python 3.11+". Not "install docker" but "Docker 24.0+ with BuildKit enabled."
9. **Inline diagrams at the point of explanation.** Don't dump diagrams at the end.
10. **Every metric needs context.** Not "40% faster" but "p99 from 340ms to 205ms under 2k concurrent connections."

</writing_rules>

<reference_index>
All visual generation knowledge in `references/`:

**Mermaid Syntax:** mermaid-patterns.md — Validated patterns for every diagram type with pitfalls and fixes
**SVG Charts:** svg-components.md — Bar charts, line charts, metric cards, responsive layouts
**HTML Templates:** html-visual-templates.md — Hero images, social cards, code cards with platform dimensions
**Distribution:** distribution-checklist.md — Platform formatting, image requirements, publishing order, SEO
</reference_index>

<workflows_index>
| Workflow | Purpose |
|----------|---------|
| full-blog-post.md | Complete blog post with all visual assets and social package |
| tutorial-guide.md | Step-by-step tutorial with prerequisites, code, and diagrams |
| generate-visuals.md | Visual assets only for existing content |
| architecture-writeup.md | System design post with C4 diagrams |
| performance-report.md | Data-driven post with SVG charts and benchmarks |
| release-notes.md | Release communication with visual summaries |
</workflows_index>

<success_criteria>
A successful output includes:
- Content a senior developer finds genuinely useful and technically accurate
- Every code block is copy-paste runnable with correct language tags
- Minimum: 1 hero image (HTML) + 2 inline visuals (Mermaid/SVG) per blog post
- All Mermaid diagrams render without syntax errors
- All SVG charts have axes, labels, legend if multi-series, professional styling
- All HTML cards self-contained with inline CSS, zero external dependencies
- Social cards sized for target platform (Twitter: 1200x628, LinkedIn: 1200x627)
- Content follows appropriate post type template
- No fabricated code, output, metrics, or benchmarks
- Technical depth sufficient for reproduction by target audience

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Use external image APIs or third-party services for visuals | This skill generates all visuals natively — external deps add fragility and cost | Use Mermaid, SVG, or HTML+CSS visual generation built into the skill |
| Include code blocks without language tags | Untagged blocks lose syntax highlighting and copy-paste reliability | Always specify: python, bash, yaml, json, typescript, etc. |
| Fabricate benchmarks, metrics, or terminal output | Fake data destroys credibility with technical audiences instantly | Use real data, real output, or clearly label as illustrative |
| Bundle multiple core insights into one post | Diluted posts satisfy no one — readers want depth on one topic | One post = one core insight; split multi-insight content into separate posts |

## When NOT to Use

- Writing general (non-technical) blog posts without diagrams (use `blog-post-writer`)
- Generating standalone diagrams without accompanying content (use `diagram`)
- Managing project documentation (use `docs`)
- Crafting marketing copy or non-technical prose (use `copywriting`)

## Conflicts

- **blog-post-writer**: Use blog-post-writer for general blog posts without visual assets; technical-content-creator for developer content with Mermaid/SVG/HTML visuals
- **diagram**: Use diagram for standalone DDD diagrams; technical-content-creator for inline diagrams within blog posts

## Related Skills
- `blog-post-writer` — write general blog posts when technical diagrams and visual assets are not required
- `copywriting` — craft polished prose and narrative flow for technical content
- `research` — gather technical findings and benchmarks to incorporate as evidence in articles
- `diagram` — generate standalone diagrams separate from the full blog post workflow
- `docs` — create and manage project documentation as an alternative to public-facing blog content
</success_criteria>
