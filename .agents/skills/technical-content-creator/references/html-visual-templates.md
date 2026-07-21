<html_visual_templates>

<hero_image_template>
Blog hero image — 1200x630px, self-contained HTML, screenshot-ready:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;">
<div style="width:1200px;height:630px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;position:relative;overflow:hidden;">

  <!-- Decorative grid -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background-image:radial-gradient(circle at 1px 1px,rgba(99,102,241,0.15) 1px,transparent 0);background-size:40px 40px;"></div>

  <!-- Accent glow -->
  <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%);border-radius:50%;"></div>

  <!-- Category tag -->
  <div style="position:relative;z-index:1;display:inline-block;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:20px;padding:6px 16px;margin-bottom:24px;width:fit-content;">
    <span style="color:#a5b4fc;font-size:14px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">CATEGORY_HERE</span>
  </div>

  <!-- Title -->
  <h1 style="position:relative;z-index:1;color:#f1f5f9;font-size:48px;font-weight:800;line-height:1.15;margin:0 0 20px 0;max-width:900px;">TITLE_HERE</h1>

  <!-- Subtitle / key metric -->
  <p style="position:relative;z-index:1;color:#94a3b8;font-size:20px;line-height:1.5;margin:0 0 32px 0;max-width:700px;">SUBTITLE_HERE</p>

  <!-- Author + date -->
  <div style="position:relative;z-index:1;display:flex;align-items:center;gap:12px;">
    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">
      <span style="color:white;font-weight:700;font-size:16px;">N</span>
    </div>
    <div>
      <div style="color:#f1f5f9;font-size:14px;font-weight:600;">AUTHOR_HERE</div>
      <div style="color:#64748b;font-size:13px;">DATE_HERE</div>
    </div>
  </div>
</div>
</body>
</html>
```

Customization: Replace CATEGORY_HERE, TITLE_HERE, SUBTITLE_HERE, AUTHOR_HERE, DATE_HERE.
Accent glow color: match category (purple for architecture, green for performance, red for debugging).
</hero_image_template>

<twitter_card_template>
Twitter/X card — 1200x628px:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;">
<div style="width:1200px;height:628px;background:linear-gradient(160deg,#0f172a,#1a1a2e);display:flex;align-items:center;padding:0 60px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;position:relative;overflow:hidden;">

  <!-- Left content -->
  <div style="flex:1;z-index:1;">
    <div style="color:#6366f1;font-size:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">CATEGORY</div>
    <div style="color:#f1f5f9;font-size:42px;font-weight:800;line-height:1.2;margin-bottom:16px;max-width:600px;">TITLE_HERE</div>
    <div style="color:#94a3b8;font-size:18px;line-height:1.5;max-width:500px;">KEY_TAKEAWAY</div>
    <div style="margin-top:24px;color:#64748b;font-size:14px;">AUTHOR · DATE</div>
  </div>

  <!-- Right metric/visual -->
  <div style="width:280px;height:280px;background:rgba(99,102,241,0.1);border:2px solid rgba(99,102,241,0.3);border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1;">
    <div style="color:#22d3ee;font-size:56px;font-weight:800;">METRIC</div>
    <div style="color:#94a3b8;font-size:16px;margin-top:8px;">METRIC_LABEL</div>
  </div>

  <!-- Background decoration -->
  <div style="position:absolute;bottom:-80px;left:-80px;width:300px;height:300px;background:radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%);border-radius:50%;"></div>
</div>
</body>
</html>
```
</twitter_card_template>

<linkedin_card_template>
LinkedIn card — 1200x627px:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;">
<div style="width:1200px;height:627px;background:#0f172a;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;position:relative;">

  <div style="position:absolute;top:0;right:0;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.05));"></div>

  <div style="color:#6366f1;font-size:14px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:20px;z-index:1;">CATEGORY</div>
  <div style="color:#f1f5f9;font-size:44px;font-weight:800;line-height:1.2;margin-bottom:24px;max-width:800px;z-index:1;">TITLE_HERE</div>

  <!-- 3 key points -->
  <div style="display:flex;gap:40px;margin-top:24px;z-index:1;">
    <div style="flex:1;">
      <div style="color:#22d3ee;font-size:28px;font-weight:700;">STAT_1</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:4px;">LABEL_1</div>
    </div>
    <div style="flex:1;">
      <div style="color:#059669;font-size:28px;font-weight:700;">STAT_2</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:4px;">LABEL_2</div>
    </div>
    <div style="flex:1;">
      <div style="color:#f59e0b;font-size:28px;font-weight:700;">STAT_3</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:4px;">LABEL_3</div>
    </div>
  </div>

  <div style="position:absolute;bottom:30px;left:80px;color:#64748b;font-size:13px;z-index:1;">AUTHOR · DOMAIN</div>
</div>
</body>
</html>
```
</linkedin_card_template>

<code_snippet_card_template>
Styled code card for social platforms that don't render markdown:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;">
<div style="width:800px;padding:40px;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box;">

  <!-- Window chrome -->
  <div style="background:#1e293b;border-radius:12px 12px 0 0;padding:12px 16px;display:flex;align-items:center;gap:8px;">
    <div style="width:12px;height:12px;border-radius:50%;background:#ef4444;"></div>
    <div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;"></div>
    <div style="width:12px;height:12px;border-radius:50%;background:#22c55e;"></div>
    <span style="color:#64748b;font-size:13px;margin-left:12px;">FILENAME</span>
  </div>

  <!-- Code area -->
  <div style="background:#1e293b;border-radius:0 0 12px 12px;padding:24px;border-top:1px solid #334155;">
    <pre style="margin:0;color:#e2e8f0;font-family:'SF Mono','Fira Code','Cascadia Code',monospace;font-size:14px;line-height:1.6;white-space:pre;overflow:hidden;"><code>CODE_HERE</code></pre>
  </div>

  <!-- Caption -->
  <div style="color:#94a3b8;font-size:13px;margin-top:12px;text-align:center;">CAPTION</div>
</div>
</body>
</html>
```

Replace CODE_HERE with actual code. Use HTML entities for < > & characters.
Syntax highlighting: wrap keywords in spans with colors:
- Keywords: `#c084fc` (purple)
- Strings: `#a5f3fc` (cyan)
- Comments: `#64748b` (gray)
- Functions: `#fbbf24` (amber)
- Numbers: `#f87171` (red)
</code_snippet_card_template>

<metric_highlight_card_template>
Single metric callout card:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;">
<div style="width:400px;height:200px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;border:1px solid #334155;">
  <div style="color:#94a3b8;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">METRIC_LABEL</div>
  <div style="color:#f1f5f9;font-size:52px;font-weight:800;line-height:1;">VALUE</div>
  <div style="color:#059669;font-size:16px;font-weight:600;margin-top:8px;">↓ CHANGE from BASELINE</div>
</div>
</body>
</html>
```
</metric_highlight_card_template>

<platform_dimensions>
| Platform | Width | Height | Ratio |
|----------|-------|--------|-------|
| Blog hero | 1200 | 630 | ~1.9:1 |
| Twitter card | 1200 | 628 | ~1.91:1 |
| LinkedIn card | 1200 | 627 | ~1.91:1 |
| Dev.to cover | 1000 | 420 | ~2.38:1 |
| Open Graph | 1200 | 630 | ~1.9:1 |
| Code card | 800 | auto | - |
| Metric card | 400 | 200 | 2:1 |
</platform_dimensions>

<screenshot_instructions>
To convert HTML cards to images for uploading:

**In Claude Code / CLI:**
```bash
# Install puppeteer if needed
npm install -g puppeteer

# Screenshot HTML to PNG
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 630});
  await page.goto('file://' + process.argv[1]);
  await page.screenshot({path: process.argv[2]});
  await browser.close();
})();
" hero.html hero.png
```

**Alternative (no puppeteer):**
Open the HTML file in any browser, use browser DevTools device emulation set to the exact dimensions, then take a screenshot. All templates use inline CSS and system fonts — they render identically everywhere.
</screenshot_instructions>

</html_visual_templates>
