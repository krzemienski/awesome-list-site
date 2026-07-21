<overview>
End-to-end validation for Web Frontends. Start the REAL dev server, automate a REAL browser (Playwright or agent-browser), interact through the REAL UI, capture screenshots at every step, and verify visual correctness. Never use jsdom, Testing Library, or render components in isolation.
</overview>

<tool_selection>
Two browser automation options. Choose based on environment:

| Tool | Best For | Install |
|------|----------|---------|
| **agent-browser** (Vercel) | Claude Code environments, interactive CLI | `npm i -g agent-browser && agent-browser install --with-deps` |
| **Playwright** | Scriptable validation, CI pipelines | `npm i playwright && npx playwright install chromium` |

**agent-browser** is preferred for interactive Claude Code sessions (more natural CLI workflow).
**Playwright** is preferred when scripting is needed or for --ci mode.

Check platform: `uname -s` — agent-browser requires Linux, WSL, or macOS.
</tool_selection>

<agent_browser_commands>
```bash
agent-browser open <url>              # Navigate to page
agent-browser snapshot -i             # Get interactive elements with refs (@e1, @e2...)
agent-browser click @eN               # Click element by ref
agent-browser fill @eN "text"         # Clear field and type
agent-browser select @eN "option"     # Select dropdown option
agent-browser press Enter             # Press a key
agent-browser screenshot <path>       # Save screenshot
agent-browser screenshot --annotate   # Screenshot with numbered labels
agent-browser set viewport W H        # Set viewport (375 812 for mobile)
agent-browser wait --load networkidle # Wait for page to settle
agent-browser console                 # Check for JS errors
agent-browser errors                  # Check for uncaught exceptions
agent-browser get text @eN            # Get element text
agent-browser get url                 # Get current URL
agent-browser close                   # End session
```

**CRITICAL**: Refs become invalid after navigation or DOM changes. Always re-snapshot after page navigation, form submissions, or dynamic content updates.
</agent_browser_commands>

<playwright_pattern>
```javascript
// validate.mjs — Playwright validation script
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const EVIDENCE = './e2e-evidence/web';
await mkdir(EVIDENCE, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  // 1. Navigate and screenshot initial state
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: `${EVIDENCE}/01-home.png`, fullPage: true });

  // 2. Interact through REAL UI
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.screenshot({ path: `${EVIDENCE}/02-dashboard.png`, fullPage: true });

  // 3. Verify CONTENT (not just page load)
  const heading = await page.textContent('h1');
  console.log(`Dashboard heading: ${heading}`);

  // 4. Check console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

} catch (err) {
  await page.screenshot({ path: `${EVIDENCE}/error-state.png` });
  console.error('FAIL:', err.message);
  process.exit(1);
} finally {
  await browser.close();
}
```
</playwright_pattern>

<journeys_to_validate>
For web frontends, validate these journey categories:

1. **Initial load** — Page renders with correct content, no console errors
2. **Navigation** — All routes load correctly, back/forward works
3. **Forms** — Fill, submit, verify success state, verify data persisted
4. **Authentication** — Login flow, protected routes redirect, logout works
5. **Interactive elements** — Modals, dropdowns, tabs, toggles, accordions
6. **Error states** — Invalid input shows user-friendly errors, network failures handled
7. **Responsive design** — Mobile (375px), Tablet (768px), Desktop (1440px)
8. **Accessibility** — Keyboard navigation, focus management, ARIA labels
9. **Data display** — Lists show correct data, pagination works, filters apply
10. **Real-time updates** — WebSocket data appears, notifications show
</journeys_to_validate>

<responsive_testing>
Test at three viewports minimum. Screenshot every major page at each:

| Viewport | Size | Device |
|----------|------|--------|
| Mobile | 375 × 812 | iPhone 13 |
| Tablet | 768 × 1024 | iPad |
| Desktop | 1440 × 900 | Laptop |

```bash
# agent-browser
for vp in "375 812" "768 1024" "1440 900"; do
  W=$(echo $vp | cut -d' ' -f1)
  H=$(echo $vp | cut -d' ' -f2)
  agent-browser set viewport $W $H
  agent-browser screenshot "e2e-evidence/web/responsive-${W}x${H}.png"
done
```

Check for: overflow, broken alignment, touch targets (44px minimum on mobile), text readability.
</responsive_testing>

<pass_criteria_examples>
| Verification | Good Evidence | Bad Evidence |
|-------------|--------------|----------------|
| Page loads | Screenshot showing real content + layout | `200 OK` from curl |
| Form works | Screenshot of filled form + success state | Console log "form submitted" |
| Navigation | Screenshot of destination with correct URL | `page.goto` didn't throw |
| Error states | Screenshot showing user-friendly error | Console showing error caught |
| Responsive | Screenshots at 375px, 768px, 1440px | Only tested at one viewport |
</pass_criteria_examples>

<failure_troubleshooting>
| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page | JS bundle failed to load | Check browser console for errors |
| Element not found | Wrong selector or not rendered | Use `waitForSelector` with timeout |
| Timeout on navigation | Navigation didn't happen | Screenshot BEFORE expected navigation |
| CORS/network errors | Backend not running | Start backend first, check proxy config |
| Stale data | Browser cache | Use fresh context / incognito |
| Refs invalid (agent-browser) | DOM changed | Re-snapshot after every interaction |
</failure_troubleshooting>

<never>
- NEVER use jsdom or happy-dom — they don't render CSS or run JS correctly
- NEVER mock fetch/axios — mocked responses diverge from real API
- NEVER render components in isolation (Testing Library, Storybook)
- NEVER use snapshot testing as validation
- NEVER skip visual verification — READ screenshots, don't just check they exist
</never>
