<distribution_reference>

<publishing_order>
1. **Blog (canonical)** — Publish first on your own domain. This is the canonical URL.
2. **Dev.to** — Cross-post within 24 hours. Set `canonical_url` in frontmatter to your blog.
3. **Hashnode** — Cross-post if you have an account. Set canonical.
4. **Twitter/X thread** — Post thread linking back to blog. Include 1-2 code screenshots.
5. **LinkedIn** — Post article or text post. Link to blog in first comment, NOT in post body (LinkedIn suppresses posts with external links in body).
6. **Newsletter** — Send within 48 hours. Include exclusive insight not in blog.
7. **HackerNews** — Submit if post has genuine technical depth. Best times: Tuesday-Thursday, 8-10am EST.
8. **Reddit** — Post to relevant subreddit (r/programming, r/webdev, r/devops, etc.). Follow subreddit rules.
</publishing_order>

<platform_formatting>

**Blog (Markdown):**
- Frontmatter: title, date, description, tags, author, hero image path
- Code blocks: triple backtick with language tag
- Images: relative paths, include alt text
- Max width: 700-800px content area

**Dev.to:**
- Frontmatter: `title`, `published: true`, `description`, `tags` (max 4), `canonical_url`, `cover_image`
- Max 4 tags, lowercase, no spaces (use hyphens)
- Liquid tags for embeds: `{% embed URL %}`
- Code blocks: triple backtick with language
- Cover image: 1000x420 minimum

**Twitter/X Thread:**
- First tweet: Hook + promise of what they'll learn
- 7-12 tweets total (sweet spot for engagement)
- One code screenshot per 3 tweets
- Last tweet: CTA + link to full blog
- Alt text on all images
- No hashtags in thread body (kills engagement), one #topic at the end

**LinkedIn:**
- 200-350 words for posts (not articles)
- Pattern-interrupt first line (question, bold claim, or surprising stat)
- Line breaks between every 1-2 sentences (mobile readability)
- Max 3 hashtags at the very end
- Link to blog in FIRST COMMENT, not in post body
- If using article format: include hero image, format like short blog

**Newsletter:**
- Subject line: 6-10 words, specific benefit or curiosity gap
- Preview text: Different from subject, expand the hook
- 400-600 words body
- ONE exclusive insight not in the blog
- Single CTA linking to blog
- Plain text friendly (not all readers render HTML)
</platform_formatting>

<seo_basics>
1. Title tag: Include primary keyword, under 60 characters
2. Meta description: 150-160 chars, include keyword, end with benefit
3. H1: Match or closely mirror title tag
4. URL slug: 3-5 words, hyphens, no stop words
5. First paragraph: Include primary keyword naturally
6. Alt text: Describe what every image shows (for accessibility AND SEO)
7. Internal links: Link to 2-3 related posts on your blog
8. External links: Link to sources, documentation, tools mentioned
9. Schema markup: Article schema with author, date, description
</seo_basics>

<blog_frontmatter_template>
```yaml
---
title: "Your Title Here"
date: 2026-01-15
description: "150-char description with primary keyword and benefit"
tags: [tag1, tag2, tag3]
author: "Your Name"
hero_image: "/images/posts/slug/hero.png"
hero_alt: "Description of hero image"
canonical_url: "https://yourdomain.com/blog/slug"
---
```
</blog_frontmatter_template>

<devto_frontmatter_template>
```yaml
---
title: "Your Title Here"
published: true
description: "150-char description"
tags: tag1, tag2, tag3, tag4
canonical_url: https://yourdomain.com/blog/slug
cover_image: https://yourdomain.com/images/posts/slug/hero.png
---
```
</devto_frontmatter_template>

<visual_asset_usage>
| Asset | Where to Use |
|-------|-------------|
| hero.html → hero.png | Blog header, Dev.to cover, Open Graph |
| social-card-twitter.html → twitter.png | Twitter card image (og:image for twitter:card) |
| social-card-linkedin.html → linkedin.png | LinkedIn post image |
| architecture-diagram.mermaid | Inline in blog post, render with mermaid.js |
| performance-chart.svg | Inline in blog post |
| code-card.html → code-card.png | Twitter thread code screenshots |
| metric-card.svg | Blog inline, social posts |
</visual_asset_usage>

</distribution_reference>
