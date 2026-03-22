<required_reading>
Before starting, read these references:
- references/mermaid-patterns.md (for diagram generation)
- references/svg-components.md (for chart generation)
- references/html-visual-templates.md (for hero and social cards)
- references/distribution-checklist.md (for publishing assets)
</required_reading>

<process>

**Phase 1: Content Planning**

1. Identify the ONE core insight. Ask: "What would make a senior developer stop scrolling?"
2. Determine post type (tutorial, deep dive, war story, benchmark — see SKILL.md post_type_patterns)
3. Outline the post following the appropriate template structure
4. Identify visual opportunities:
   - What architecture/flow needs a diagram?
   - What data/metrics need a chart?
   - What's the hero image angle?
5. List all code snippets that will appear — verify each is runnable

**Phase 2: Visual Asset Generation**

Generate visuals BEFORE writing prose (they inform the writing):

1. **Hero image**: Use html-visual-templates.md `hero_image_template`
   - Set title, category, subtitle, author, date
   - Choose accent color to match category
   - Save as `visuals/hero.html`

2. **Architecture / flow diagrams**: Use mermaid-patterns.md
   - Identify every system, flow, or process described in the outline
   - Generate Mermaid for each
   - Validate: no spaces in node IDs, no nested quotes, proper arrow syntax
   - Save each as `visuals/{name}.mermaid`

3. **Performance / data charts**: Use svg-components.md
   - For every before/after claim, generate a comparison bar chart
   - For time-series data, generate a line chart
   - Include axes, labels, data values, legend
   - Save as `visuals/{name}.svg`

4. **Social cards**: Use html-visual-templates.md
   - Twitter card (1200x628): title + key metric
   - LinkedIn card (1200x627): title + 3 stats
   - Save as `visuals/social-card-twitter.html` and `visuals/social-card-linkedin.html`

5. **Code snippet cards** (if post has key code to highlight on social):
   - Use `code_snippet_card_template` from html-visual-templates.md
   - Syntax highlight manually with color spans
   - Save as `visuals/code-card-{n}.html`

**Phase 3: Blog Post Writing**

Write the complete blog post following these rules:

1. **Opening (first 3 paragraphs)**:
   - Show the end result (metric, screenshot description, or outcome)
   - State what the reader will learn
   - Why this matters (the "so what")

2. **Body (structured per post type template)**:
   - Place Mermaid diagrams INLINE right after the concept they illustrate
   - Reference SVG charts right after the data claims they support
   - Every code block: language tag, actual runnable code, followed by terminal output
   - Explain WHY at each decision point, not just WHAT

3. **Code blocks**:
   - Minimum: language tag on every fence
   - Show imports/setup that readers need
   - Include error handling
   - After each block: actual output when running it

4. **Closing**:
   - Recap the core insight in one sentence
   - Link to complete code repository
   - Suggest what to explore next
   - Call to action (follow, subscribe, discuss)

5. **Frontmatter**: Include blog frontmatter from distribution-checklist.md

Save as `blog_post.md`

**Phase 4: Social Distribution Assets**

1. **Twitter thread** (7-12 posts):
   - Different angle than the blog
   - Hook tweet: surprising result or contrarian take
   - 1 code screenshot reference per 3 tweets
   - Final tweet: link to full blog + CTA
   - Save as `twitter_thread.md`

2. **LinkedIn post** (200-350 words):
   - Different angle than blog AND twitter
   - Pattern-interrupt opener
   - 3 key takeaways
   - Link in first comment note
   - Max 3 hashtags
   - Save as `linkedin_post.md`

3. **Newsletter** (400-600 words):
   - Subject line + preview text
   - ONE exclusive insight not in blog
   - Single CTA to blog
   - Save as `newsletter.md`

**Phase 5: Review & Package**

1. Cross-check: no contradictions across blog, thread, LinkedIn, newsletter
2. Verify: all code blocks have language tags and are runnable
3. Verify: all Mermaid diagrams pass syntax validation
4. Verify: all SVG charts have axes, labels, data values
5. Verify: hero and social cards render at correct dimensions
6. Generate `publishing_checklist.md` with platform-specific notes

Output directory structure:
```
outputs/technical-content/{date}/
├── blog_post.md
├── twitter_thread.md
├── linkedin_post.md
├── newsletter.md
├── publishing_checklist.md
└── visuals/
    ├── hero.html
    ├── social-card-twitter.html
    ├── social-card-linkedin.html
    ├── architecture-diagram.mermaid
    ├── performance-chart.svg
    └── code-card.html
```
</process>

<success_criteria>
- Blog post: 1,500-2,500 words, all code runnable, minimum 3 visuals inline
- Hero image: Generated HTML at 1200x630
- At least 2 Mermaid diagrams, syntax-validated
- At least 1 SVG chart (if post includes any metrics/comparisons)
- Social cards: Twitter (1200x628) + LinkedIn (1200x627)
- Twitter thread: 7-12 posts, different angle than blog
- LinkedIn post: 200-350 words, different angle than blog and thread
- Newsletter: 400-600 words, one exclusive insight
- Publishing checklist: Complete with all platform-specific notes
- Zero fabricated code, metrics, or claims
</success_criteria>
