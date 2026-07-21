---
name: ck:copywriting
description: |
  Conversion copywriting formulas, headline templates, email copy patterns, landing page structures, CTA optimization, and writing style extraction.
  Use when: writing headlines, subject lines, landing page copy, email campaigns, social posts, product descriptions, CTAs, A/B variations, or applying custom writing styles from assets/writing-styles/ directory.
  Covers: AIDA, PAS, BAB, 4Ps, 4Us, FAB formulas, CRO optimization, style extraction from docs/media.
  Keywords: copy, headline, subject line, CTA, landing page, email campaign, conversion, A/B test, copywriting
license: MIT
argument-hint: "[copy-type] [context]"
---

# Copywriting

Formulas, templates, patterns, and writing styles for high-converting copy.

## When to Use

- Writing headlines/subject lines, landing page copy, email campaigns
- Social posts, product descriptions, CTA optimization, A/B variations
- Applying custom writing styles from user documents

## When NOT to Use

- Long-form narrative blog posts (use `blog-post-writer`)
- Technical documentation or tutorials (use `technical-content-creator`)
- Internal communications like team updates (use `internal-comms`)
- Brand identity and visual guidelines (use `brand-guidelines`)

## Writing Styles

Load: `references/writing-styles.md` | Full catalog: `assets/writing-styles/default.md` (50 styles)

**Extract styles from multi-format files:**
```bash
python $HOME/.claude/skills/copywriting/scripts/extract-writing-styles.py --list        # List files
python $HOME/.claude/skills/copywriting/scripts/extract-writing-styles.py --style <name> # Extract style
```

**Formats:** `.md` `.txt` `.pdf` `.docx` `.xlsx` `.pptx` `.jpg` `.png` `.mp4` (docs/media need `GEMINI_API_KEY`)

## Copy Formulas

Load: `references/copy-formulas.md`

| Formula | Structure | Best For |
|---------|-----------|----------|
| AIDA | Attention → Interest → Desire → Action | Landing pages, ads |
| PAS | Problem → Agitate → Solution | Email, sales pages |
| BAB | Before → After → Bridge | Testimonials, case studies |
| 4Ps | Promise → Picture → Proof → Push | Long-form sales |
| 4Us | Urgent + Unique + Useful + Ultra-specific | Headlines |
| FAB | Feature → Advantage → Benefit | Product descriptions |

## Headlines

Load: `references/headline-templates.md`

Patterns: "How to [X] without [Y]" • "[Number] ways to [benefit]" • "The secret to [outcome]" • "Why [belief] is wrong"

## Email Copy

Load: `references/email-copy.md`

Subject lines: Curiosity gap • Benefit-driven • Question • Urgency

## Landing Pages & CTAs

Load: `references/landing-page-copy.md` | `references/cta-patterns.md`

Hero: Headline (promise) → Subheadline (how) → CTA (action) → Social proof
CTAs: "Start [verb]ing" • "Get [benefit]" • "Yes, I want [benefit]"

## Workflows

| Workflow | Purpose | Use When |
|----------|---------|----------|
| `references/workflow-cro.md` | CRO optimization (25 principles) + plan creation workflow | Conversion optimization & CRO plan requests |
| `references/workflow-enhance.md` | Copy enhancement | Improving existing copy |
| `references/workflow-fast.md` | Quick copy generation | Simple, time-sensitive requests |
| `references/workflow-good.md` | Quality copy with research | High-stakes content |

## References

| File | Purpose |
|------|---------|
| `references/writing-styles.md` | 30 writing styles quick reference |
| `references/copy-formulas.md` | AIDA, PAS, BAB, 4Ps, FAB formulas |
| `references/headline-templates.md` | Headline patterns & templates |
| `references/email-copy.md` | Email copy patterns |
| `references/landing-page-copy.md` | Landing page structure |
| `references/cta-patterns.md` | CTA optimization |
| `references/power-words.md` | Power words by emotion |
| `references/social-media-copy.md` | Platform-specific copy |
| `scripts/extract-writing-styles.py` | Extract styles from multi-format files |
| `templates/copy-brief.md` | Creative brief template |

## Agent Integration

**Primary:** fullstack-developer | **Related:** brand-guidelines, content-marketing, email-marketing

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Write features without benefits | Features don't sell — outcomes do | Every feature sentence must answer "so the user can..." |
| Use multiple CTAs competing for attention | Decision paralysis kills conversion — one clear next step wins | One primary CTA per section; secondary actions visually demoted |
| Write copy before knowing the audience's awareness level | Unaware readers need problem framing, solution-aware readers need proof | Identify awareness stage (unaware/problem/solution/product/most-aware) first |
| Stuff power words without substance | "Revolutionary game-changing breakthrough" reads as empty hype | One power word per sentence max, backed by a specific claim |
| Skip the headline testing step | 80% of readers only see the headline — it's your entire funnel gate | Write 10+ headline variants, test top 3 before committing |

## Best Practices

1. Lead with benefit, not feature | 2. One CTA per piece
3. Specificity > vague claims | 4. Read aloud—if awkward, rewrite
5. Test headlines first | 6. Match copy to awareness level

## Conflicts

- **blog-post-writer**: Use blog-post-writer for long-form narrative; copywriting for conversion-focused short copy
- **technical-content-creator**: Use technical-content-creator when code/diagrams are primary; copywriting for marketing-oriented developer content
- **internal-comms**: Use internal-comms for team-facing; copywriting for customer-facing

## Related Skills
- `blog-post-writer` — long-form narrative writing with personal voice
- `technical-content-creator` — developer-focused content with diagrams and code
- `brand-guidelines` — apply consistent brand colors and typography to copy artifacts
- `internal-comms` — write internal communications (newsletters, updates, FAQs)
- `prd` — translate copywriting requirements into structured product specs
