# Cycle 6 auditor brief (shared by every slice)

Goal: re-audit https://awesome.video on revision 520d6778369bc7ce495204cfcacc7e0533f941cc for a zero-defects verdict. Report every defect you can prove (any severity). Re-check every earlier finding in your slice and mark it FIXED with fresh evidence or STILL-OPEN. A gap is not a pass.

## Start gate
Before anything, wait until `curl -s https://awesome.video/api/version` returns revision 520d6778369bc7ce495204cfcacc7e0533f941cc (poll every 30s with a bash until-loop, up to 40 min). If it never arrives, report BLOCKED. Record the revision at start and end.

## Tools
- agent-browser with your own AGENT_BROWSER_SESSION name, or chrome-devtools MCP with your own isolatedContext. agent-browser headless never scrolls (use a tall viewport or chrome-devtools below the fold); Radix triggers need real pointer clicks, not DOM .click().
- Widths: 1440x900, 820x1180 touch emulation, 390x844 touch emulation. Reduced motion and keyboard where relevant.
- Single curl reads are fine for non-UI facts only. Every UI PASS requires real navigation plus interaction, an accessibility snapshot, screenshot and console/network state. HTTP 200 is not UI proof.
- QA analytics: set localStorage `umami.disabled`=`1` and decline consent.

## Admin/owner session (admin and member slices only)
Cookie jar /tmp/aw-prod-owner.jar and header file /tmp/aw-prod-owner.cookieheader (mode 600; never print their contents). Only let the cookie value reach a command through shell expansion:
- `agent-browser cookies set --curl /tmp/aw-prod-owner.cookieheader`
- or `curl -H "Cookie: $(cat /tmp/aw-prod-owner.cookieheader)"`
Never cat or echo the file on its own. Never put the value into an MCP argument, extraHttpHeaders or evaluate_script. `agent-browser --headers` expects JSON; do not use it for the cookie. Signed-in slices use agent-browser. If the session dies, report BLOCKED; do not log in.
NEVER sign out the owner and never click "Sign out all devices". That revokes every owner session.

## Hard rules (owner, verbatim where quoted)
- "Verification: never write or execute scripts (Playwright/Node/shell harnesses). Drive the real app through the in-app browser / browser tools directly."
- No test files/scripts, no mocks, stubs, fake data, test-mode bypasses. No code edits; you are an auditor.
- Production writes ONLY rows you create, titled `[QA-audit-1026]`, removed by id before you finish, then confirmed 404/absent. Never edit/delete/approve/reject real rows, never bulk-approve, never delete users, never change secrets, never run research/enrichment/import jobs that write (dry-run/preview is fine). Any unavoidable side effect: log it in created-rows.md.
- Never print secrets. Stop only processes you started by PID. Never pkill/killall. Never `agent-browser close --all`.

## Target-size rule
Measure visible interactive elements (exclude .sr-only, aria-hidden, inline links in running text, card titles covered by an overlay). <24px FAILS unless the WCAG spacing exception holds. On touch widths, buttons, pills, tabs, pagination and menu items must be >=44px. A hover-only control hidden at rest is a FAIL on touch.

## Output
Do NOT write report files. Return the full findings.md content in your final message; save screenshots and raw evidence under cycle-06/<slice>/. Report table: id (continue prior prefix numbering), severity, URL, width, saw vs expected, evidence path, likely source path:line. Then sections: earlier-cycle re-checks (FIXED/STILL-OPEN), Passed with evidence, UNVERIFIED or BLOCKED with exact reasons. Final message: verdict PASS (0 findings and no open in-scope gaps) / ISSUES / BLOCKED, plus one line per finding.

## Cycle-6 additions
- #93: app-level network failures retry with a bound held across remounts; lazy-chunk reload probes /api/health.
- #94 and #100: same-origin API and subresource Referer is origin-only; document Referrer-Policy is strict-origin.
- #95: recommendation feedback Undo/Restore, settings switch focus ring, journey currentStepId.
- #96: admin Users clear 44px, auth.* audit chips, shared AdminOpsTable scroll fade.
- #97: 820 filters sheet footer is flush to the bottom.
- #98: error copy distinguishes offline from online-but-server-unreachable; generic error card shows probe feedback.
- #99: first and repeated in-page fragment activation scroll/focus correctly; native clicks clear stale pop state; Back/Forward and skip link preserved.
- #101: paginator Enter cannot recommit stale blur text; taxonomy create/edit field errors mark/focus/describe inputs.
- #103: not_for_me/already_known immediately remove cards from active recommendations and keep Restore/focus behavior.

## Required release-only checks
- Cold signed-out load of `/search?q=%3Cscript%3E`: rendered results, no asset/API 403, origin-only Referer, no application console errors.
- Error cards: offline copy, online-unreachable copy, five-probe bound, no reload loop, recovery and navigation cancellation.
- Fragment matrix: first/repeated activation, direct load, malformed/missing fragments, skip link, Back/Forward and next-path scroll/focus.
- Admin paginator at 25/50/100 rows: Enter lands and stays; blur still commits; public paginator unaffected. Taxonomy create/edit empty fields and duplicate 409 mark/focus/describe correctly.
- Recommendation feedback: not_for_me/already_known disappear immediately, appear only in Restore, and Restore returns them without active/Restore duplication.

## Cycle-5 UNVERIFIED items you must cover now
### Public core
- First load with no fragment at 390.
- Fragment → page → Back at 390 using the keyboard.
- Offline at 390 and 820.
- Tab-key walk of a card.
- The 820 filters sheet after PC-25.
- Tag typed jump.
### Public secondary
- Reduced motion.
- Full keyboard walk.
- Target sweeps at 820 and 1440 for every page.
### Accessibility
- #93 error-page auto-recover timing.
- Real screen-reader speech: only PASS if actually exercised; otherwise BLOCKED, never assumed.
### Member
- #82 tag-card bookmark/favorite actions.
- A populated notification inbox.
- Notification Unsubscribe all, Reset and Save; theme writes. Restore all changed settings.
- Account deletion: never delete the real owner account; report the real deletion BLOCKED-by-policy after checking only safe navigation/cancel behavior.
### Admin content
- Real coarse pointer and real screen-reader speech: BLOCKED unless actually exercised.
- Live approve/reject on run-owned QA rows; saving journey steps with net-zero cleanup.
- Reduced motion.
### Admin ops
- Real touch input: BLOCKED unless actually exercised.
- Live 5xx toast: no production fault injection or mocks; report BLOCKED if it cannot be triggered safely.
- Validation lists and backup tables: inspect empty states; populated states are BLOCKED if no eligible data exists.
### Admin AI
- Offline handling.
- Full keyboard walk and reduced motion.
- Real touch: BLOCKED unless actually exercised.
- AI-14 and AI-18 live job flows: do not start paid/writing jobs; report BLOCKED-by-policy rather than PASS.

Owner session expires at 12:19Z. The lead re-mints it; never sign out. Return every unexecuted item as UNVERIFIED/BLOCKED, never silently drop it.
