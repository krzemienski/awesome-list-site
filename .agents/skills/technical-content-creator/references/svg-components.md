<svg_reference>

<color_palette>
Primary: #1e40af (blue), #059669 (green), #6366f1 (indigo), #f59e0b (amber), #ef4444 (red)
Background: #0f172a (dark), #1e293b (dark-lighter), #f8fafc (light)
Text: #f1f5f9 (on dark), #1e293b (on light)
Grid: #334155 (dark), #e2e8f0 (light)
Accent: #22d3ee (cyan), #a78bfa (violet), #fb923c (orange)
</color_palette>

<bar_chart_template>
Horizontal bar chart for comparisons (before/after, A vs B):

```svg
<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  <rect width="600" height="300" fill="#0f172a" rx="8"/>

  <!-- Title -->
  <text x="300" y="30" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="600">Chart Title</text>

  <!-- Y axis labels -->
  <text x="90" y="85" text-anchor="end" fill="#94a3b8" font-size="13">Before</text>
  <text x="90" y="145" text-anchor="end" fill="#94a3b8" font-size="13">After</text>

  <!-- Bars -->
  <rect x="100" y="65" width="400" height="30" fill="#ef4444" rx="4"/>
  <rect x="100" y="125" width="240" height="30" fill="#059669" rx="4"/>

  <!-- Data labels -->
  <text x="510" y="85" fill="#f1f5f9" font-size="12" font-weight="600">340ms</text>
  <text x="350" y="145" fill="#f1f5f9" font-size="12" font-weight="600">205ms</text>

  <!-- Improvement callout -->
  <text x="300" y="200" text-anchor="middle" fill="#22d3ee" font-size="20" font-weight="700">40% faster</text>
  <text x="300" y="220" text-anchor="middle" fill="#94a3b8" font-size="12">p99 latency under 2,000 concurrent connections</text>
</svg>
```

Customization points:
- Adjust bar widths proportionally to data values
- Scale: max bar width = 400px, calculate others as (value/max_value * 400)
- Add more bars by incrementing Y position by 60px each
- Color code: red/amber for "before/bad", green/blue for "after/good"
</bar_chart_template>

<vertical_bar_chart_template>
Vertical bar chart for multi-category comparisons:

```svg
<svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  <rect width="600" height="350" fill="#0f172a" rx="8"/>

  <!-- Title -->
  <text x="300" y="30" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="600">Response Time by Endpoint</text>

  <!-- Grid lines -->
  <line x1="80" y1="280" x2="560" y2="280" stroke="#334155" stroke-width="1"/>
  <line x1="80" y1="220" x2="560" y2="220" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
  <line x1="80" y1="160" x2="560" y2="160" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
  <line x1="80" y1="100" x2="560" y2="100" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>

  <!-- Y axis labels -->
  <text x="75" y="284" text-anchor="end" fill="#94a3b8" font-size="11">0ms</text>
  <text x="75" y="224" text-anchor="end" fill="#94a3b8" font-size="11">100ms</text>
  <text x="75" y="164" text-anchor="end" fill="#94a3b8" font-size="11">200ms</text>
  <text x="75" y="104" text-anchor="end" fill="#94a3b8" font-size="11">300ms</text>

  <!-- Bars (height = value/300 * 180, y = 280 - height) -->
  <rect x="120" y="160" width="60" height="120" fill="#6366f1" rx="4"/>
  <rect x="240" y="220" width="60" height="60" fill="#059669" rx="4"/>
  <rect x="360" y="100" width="60" height="180" fill="#ef4444" rx="4"/>
  <rect x="480" y="190" width="60" height="90" fill="#f59e0b" rx="4"/>

  <!-- X axis labels -->
  <text x="150" y="300" text-anchor="middle" fill="#94a3b8" font-size="11">/api/users</text>
  <text x="270" y="300" text-anchor="middle" fill="#94a3b8" font-size="11">/api/posts</text>
  <text x="390" y="300" text-anchor="middle" fill="#94a3b8" font-size="11">/api/search</text>
  <text x="510" y="300" text-anchor="middle" fill="#94a3b8" font-size="11">/api/feed</text>

  <!-- Data labels on bars -->
  <text x="150" y="155" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600">200ms</text>
  <text x="270" y="215" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600">100ms</text>
  <text x="390" y="95" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600">300ms</text>
  <text x="510" y="185" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600">150ms</text>
</svg>
```
</vertical_bar_chart_template>

<line_chart_template>
Time-series / trend line chart:

```svg
<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  <rect width="600" height="300" fill="#0f172a" rx="8"/>

  <!-- Title -->
  <text x="300" y="25" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="600">Build Time Over 30 Days</text>

  <!-- Grid -->
  <line x1="60" y1="250" x2="570" y2="250" stroke="#334155"/>
  <line x1="60" y1="50" x2="60" y2="250" stroke="#334155"/>

  <!-- Grid lines horizontal -->
  <line x1="60" y1="200" x2="570" y2="200" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
  <line x1="60" y1="150" x2="570" y2="150" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>
  <line x1="60" y1="100" x2="570" y2="100" stroke="#334155" stroke-width="0.5" stroke-dasharray="4"/>

  <!-- Line (polyline for smooth data) -->
  <polyline
    points="80,200 130,190 180,210 230,180 280,150 330,140 380,120 430,110 480,90 530,70"
    fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Data points -->
  <circle cx="80" cy="200" r="4" fill="#6366f1"/>
  <circle cx="530" cy="70" r="4" fill="#6366f1"/>

  <!-- Annotation -->
  <text x="530" y="60" text-anchor="middle" fill="#22d3ee" font-size="11" font-weight="600">45s</text>
  <text x="80" y="218" text-anchor="middle" fill="#94a3b8" font-size="11">120s</text>

  <!-- Axis labels -->
  <text x="300" y="275" text-anchor="middle" fill="#94a3b8" font-size="11">Days</text>
  <text x="25" y="150" text-anchor="middle" fill="#94a3b8" font-size="11" transform="rotate(-90,25,150)">Seconds</text>
</svg>
```

For multi-line: add additional `<polyline>` elements with different colors. Add legend:
```svg
<rect x="400" y="40" width="12" height="12" fill="#6366f1" rx="2"/>
<text x="416" y="50" fill="#94a3b8" font-size="11">Before</text>
<rect x="470" y="40" width="12" height="12" fill="#059669" rx="2"/>
<text x="486" y="50" fill="#94a3b8" font-size="11">After</text>
```
</line_chart_template>

<metric_card_template>
Single metric highlight card:

```svg
<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, sans-serif">
  <rect width="300" height="150" fill="#0f172a" rx="12" stroke="#1e293b" stroke-width="1"/>
  <text x="150" y="45" text-anchor="middle" fill="#94a3b8" font-size="13">Build Time</text>
  <text x="150" y="85" text-anchor="middle" fill="#f1f5f9" font-size="36" font-weight="700">2.4s</text>
  <text x="150" y="115" text-anchor="middle" fill="#059669" font-size="14" font-weight="600">↓ 62% from 6.3s</text>
</svg>
```
</metric_card_template>

<construction_guidelines>
1. Always set `viewBox` for responsive scaling — never use fixed width/height in px
2. Use `rx` on rects for rounded corners (4-12px)
3. Calculate bar heights proportionally: `height = (value / max_value) * max_bar_height`
4. Position data labels 5-8px above their element
5. Grid lines: dashed (`stroke-dasharray="4"`), low opacity color
6. Font sizes: title 16, labels 11-13, callouts 20
7. Always include `font-family="system-ui, -apple-system, sans-serif"`
8. For dark theme backgrounds, use the dark palette. For light, swap accordingly.
</construction_guidelines>

</svg_reference>
