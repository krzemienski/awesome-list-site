---
name: content-research-writer
description: |
  Research topics and write content like blog posts, articles, and marketing copy.
  Use when: researching topics for content, writing blog posts, creating SEO-optimized articles, drafting marketing materials.
  Covers: topic research briefs, blog posts, long-form articles, how-to guides, listicles, SEO checklists, cover image generation.
  Keywords: content, writing, blog, article, research, seo, marketing, copy, listicle
version: "1.0"
license: MIT
---

# Content Research Writer

Research topics and create compelling content for blogs, articles, and marketing materials.

## When NOT to Use

- Personal voice blog posts in a specific author's style (use `blog-post-writer` for Nick Nisi's voice)
- Pure technical documentation or API references (use `docs` or `technical-content-creator`)
- Conversion-focused landing page copy (use `copywriting` for persuasion formulas)
- Content that requires Story Circle narrative structure (use `blog-post-writer` or `conference-talk-builder`)

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Publish statistics without verifying sources | Outdated or fabricated stats destroy credibility; readers fact-check | Always note "Statistics should be verified" and cite specific sources with years |
| Use keyword density above 2% | Search engines penalize keyword stuffing; reads as spam to humans | Target 1-2% keyword density; use LSI/related terms naturally |
| Write generic introductions ("In today's fast-paced world...") | Readers bounce within 3 seconds if the hook is generic; wastes the most valuable real estate | Open with a specific data point, question, or scenario that creates tension |
| Skip the research brief and jump straight to writing | Content without research is shallow opinion; lacks data, quotes, and differentiation | Always complete the Topic Research Brief template before drafting |

## Conflicts

- **`blog-post-writer`**: Focuses on Nick Nisi's personal voice and Story Circle narrative. This skill is voice-agnostic and format-flexible.
- **`copywriting`**: Focuses on conversion and persuasion. This skill focuses on informational content and SEO.
- **`technical-content-creator`**: Creates publish-ready technical posts with diagrams. This skill covers broader content types (listicles, how-tos, marketing).

## Overview

This skill helps you:
- Research topics thoroughly
- Write engaging blog posts and articles
- Create SEO-optimized content
- Develop various content formats
- Maintain brand voice consistency

## How to Use

### Research Request
```
"Research [topic] for a blog post"
"What are the key points to cover about [subject]?"
"Find statistics and examples about [topic]"
```

### Writing Request
```
"Write a blog post about [topic]"
"Create a 1500-word article on [subject]"
"Draft social media posts about [topic]"
```

### With Guidelines
```
"Write about [topic] for [audience]. Tone: [professional/casual]. Include [requirements]."
```

## Content Types

### Blog Post
```markdown
# [Attention-Grabbing Title]

**Reading time**: [X] minutes
**Published**: [Date]

[Hook - opening that captures attention]

## Introduction
[Problem statement or context - why reader should care]

## [Main Section 1]
[Content with examples, data, insights]

### [Subsection if needed]
[Detailed information]

## [Main Section 2]
[Content continuing the narrative]

## [Main Section 3]
[Content building to conclusion]

## Key Takeaways
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]

## Conclusion
[Summary and call to action]

---
**Related Articles**:
- [Link 1]
- [Link 2]
```

### Long-Form Article
```markdown
# [Title]: [Subtitle]

**Author**: [Name] | **Updated**: [Date] | **[X] min read**

> [Executive summary or key insight quote]

## Table of Contents
1. [Section 1]
2. [Section 2]
3. [Section 3]
...

## Introduction
[Context, importance, what reader will learn]

## [Section 1: Foundation]
[Comprehensive coverage]

### [Subsection]
[Details]

> **Expert Quote**: "[Quote]" — [Source]

## [Section 2: Deep Dive]
[Analysis, examples, case studies]

| Comparison | Option A | Option B |
|------------|----------|----------|
| [Factor 1] | [Value] | [Value] |
| [Factor 2] | [Value] | [Value] |

## [Section 3: Application]
[How-to, practical steps, implementation]

**Step 1**: [Action]
[Details]

**Step 2**: [Action]
[Details]

## Conclusion
[Summary, future implications, CTA]

## References
1. [Source 1]
2. [Source 2]
```

### How-To Guide
```markdown
# How to [Achieve Outcome]: A Step-by-Step Guide

**Difficulty**: [Beginner/Intermediate/Advanced]
**Time Required**: [Estimate]
**What You'll Need**: [Prerequisites]

## Overview
[Brief description of what reader will accomplish]

## Before You Start
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

## Step 1: [Action Verb + Task]
[Detailed instructions]

![Step 1 Screenshot/Image placeholder]

**Tip**: [Helpful tip for this step]

## Step 2: [Action Verb + Task]
[Detailed instructions]

⚠️ **Warning**: [Common mistake to avoid]

## Step 3: [Action Verb + Task]
[Detailed instructions]

## Troubleshooting
| Problem | Solution |
|---------|----------|
| [Issue 1] | [Fix] |
| [Issue 2] | [Fix] |

## Next Steps
Now that you've [accomplished X], you can:
- [Advanced topic 1]
- [Related skill 2]

## FAQ
**Q: [Common question]?**
A: [Answer]
```

### Listicle
```markdown
# [Number] [Topic] to [Benefit] in [Year]

[Brief intro explaining why this list matters]

## 1. [Item Name]
**Best for**: [Use case]

[Description - what it is and why it's included]

**Key Features**:
- [Feature 1]
- [Feature 2]

**Pros**: [Benefits]
**Cons**: [Drawbacks]

---

## 2. [Item Name]
[Same structure...]

---

## Comparison Table

| Tool | Price | Best For | Rating |
|------|-------|----------|--------|
| [1] | [Price] | [Use] | ⭐⭐⭐⭐⭐ |
| [2] | [Price] | [Use] | ⭐⭐⭐⭐ |

## Conclusion
[Summary of recommendations by use case]
```

## Research Output

### Topic Research Brief
```markdown
# Research Brief: [Topic]

## Overview
**Topic**: [Subject]
**Target Audience**: [Who]
**Content Goal**: [Inform/Persuade/Educate/Entertain]

## Key Points to Cover
1. [Main point 1]
   - Supporting info
   - Data/statistic
2. [Main point 2]
   - Supporting info
3. [Main point 3]

## Statistics & Data
| Stat | Source | Year |
|------|--------|------|
| [Statistic] | [Source] | [Year] |
| [Statistic] | [Source] | [Year] |

## Expert Quotes
> "[Quote]" — [Expert Name], [Title/Company]

## Common Questions (FAQ Potential)
1. [Question 1]?
2. [Question 2]?
3. [Question 3]?

## Competitor Content Analysis
| Article | Word Count | Strengths | Gaps |
|---------|------------|-----------|------|
| [URL 1] | [X] | [What's good] | [Missing] |

## Recommended Angle
[Unique perspective or approach to differentiate]

## Keywords
**Primary**: [main keyword]
**Secondary**: [keyword 2], [keyword 3]
**Long-tail**: [phrase 1], [phrase 2]
```

## SEO Guidelines

### Content Optimization
```markdown
## SEO Checklist

### Title
- [ ] Primary keyword included
- [ ] Under 60 characters
- [ ] Compelling and click-worthy

### Meta Description
- [ ] Primary keyword included
- [ ] 150-160 characters
- [ ] Clear value proposition

### Headers (H1, H2, H3)
- [ ] H1 matches/closely relates to title
- [ ] Keywords in H2s naturally
- [ ] Logical hierarchy

### Content
- [ ] Primary keyword in first 100 words
- [ ] Keyword density 1-2%
- [ ] Related keywords/LSI terms included
- [ ] Internal links: [X] links
- [ ] External links: [X] authoritative sources

### Media
- [ ] Images with alt text
- [ ] Compressed file sizes
- [ ] Descriptive file names

### Readability
- [ ] Short paragraphs (2-4 sentences)
- [ ] Subheadings every 300 words
- [ ] Bullet points for lists
- [ ] Reading level: [Grade X]
```

## Style Guidelines

### Tone Options
| Tone | Description | Example |
|------|-------------|---------|
| Professional | Formal, authoritative | "Research indicates that..." |
| Conversational | Friendly, relatable | "You know that feeling when..." |
| Educational | Clear, instructive | "Let's break this down..." |
| Persuasive | Compelling, action-oriented | "Imagine achieving..." |
| Playful | Fun, engaging | "Here's the plot twist..." |

### Best Practices
1. **Hook early**: First sentence should grab attention
2. **Be specific**: Data > vague claims
3. **Use examples**: Make abstract concrete
4. **Break it up**: Headers, bullets, images
5. **End strong**: Clear takeaway or CTA

## Cover Image Generation

After writing a blog post, generate a cover image using the `generate_cover` tool:

```
generate_cover(prompt="A detailed description of the image...", slug="your-blog-slug")
```

Save to `blogs/<slug>/hero.png`.

### Writing Effective Image Prompts

Structure your prompt with:
1. **Subject**: Main focus, specific and concrete
2. **Style**: Art direction (minimalist, isometric, flat design, 3D render, watercolor)
3. **Composition**: Element arrangement (centered, rule of thirds, symmetrical)
4. **Color palette**: Specific colors or mood (warm earth tones, cool blues and purples)
5. **Lighting/Atmosphere**: Soft diffused, dramatic shadows, golden hour, neon glow
6. **Technical details**: Aspect ratio, negative space for text overlay

### Example Prompts

**Technical post:**
```
Isometric 3D illustration of interconnected glowing cubes representing AI agents, each cube has subtle circuit patterns. Deep navy background (#0a192f) with electric blue (#64ffda) accents. Clean minimal style, lots of negative space at top for title.
```

**Tutorial/how-to:**
```
Clean flat illustration of hands typing on a keyboard with abstract code symbols floating upward, transforming into lightbulbs and gears. Warm gradient background from soft coral to light peach. Friendly, approachable style.
```

**Thought leadership:**
```
Abstract visualization of a human silhouette profile merging with geometric neural network patterns. Muted sage green and warm terracotta color scheme. Contemplative, forward-thinking mood.
```

### Blog Post Output Structure

Every blog post should produce both a post and a cover image:
```
blogs/<slug>/
├── post.md        # The blog post content
└── hero.png       # Generated cover image
```

## Related Skills
- `blog-post-writer` — personal voice blog posts using Story Circle narrative structure
- `blog-writing-guide` — mindset and banned-language rules for authentic blog writing
- `copywriting` — persuasion-focused marketing copy (conversion, not informational)
- `technical-content-creator` — publish-ready technical posts with diagrams and code samples
- `podcast-blog-post-creator` — transform podcast transcripts into blog posts

## Limitations

- Cannot guarantee SEO rankings
- Statistics should be verified
- Cannot access paywalled sources
- Brand voice requires guidance
- Visual content descriptions only
