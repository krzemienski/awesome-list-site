# 50-combo computed-style table — /settings/theme

Selected through the real system/accent pickers (data-testid system-option-*/accent-option-*) at 1440×900; values read with getComputedStyle(document.documentElement). Design values come from the canonical-token-parity extraction (awesome-list-site-ds/design-systems.jsx effective cascade + ACCENTS). `--fg` in the task text maps to the design's `--text` role (no `--fg` token exists on either side).

Result: **50/50 combos match** (0 failures).

| # | system | accent | html attrs | --accent (computed / design) | --accent-2 | --bg | --text | --text-3 (runtime) | ok |
|---|---|---|---|---|---|---|---|---|---|
| 1 | editorial | crimson | editorial/crimson | #ff3d52 / #ff3d52 | #b84dff / #b84dff | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 2 | editorial | magenta | editorial/magenta | #ec4899 / #ec4899 | #f472b6 / #f472b6 | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 3 | editorial | orange | editorial/orange | #ff7a3d / #ff7a3d | #ffb84d / #ffb84d | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 4 | editorial | amber | editorial/amber | #ffb84d / #ffb84d | #ffd86b / #ffd86b | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 5 | editorial | emerald | editorial/emerald | #34d08c / #34d08c | #5ee6b8 / #5ee6b8 | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 6 | editorial | matrix | editorial/matrix | #00ff88 / #00ff88 | #39ff14 / #39ff14 | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 7 | editorial | cyan | editorial/cyan | #5eddf2 / #5eddf2 | #7dd3fc / #7dd3fc | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 8 | editorial | violet | editorial/violet | #9d4edd / #9d4edd | #c77dff / #c77dff | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 9 | editorial | lime | editorial/lime | #aaff00 / #aaff00 | #00ff88 / #00ff88 | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 10 | editorial | rose | editorial/rose | #ff7a8a / #ff7a8a | #ffb3c1 / #ffb3c1 | #000000 / #000000 | #f4f3ee / #f4f3ee | rgba(244, 243, 238, 0.52) | PASS |
| 11 | terminal | crimson | terminal/crimson | #ff3d52 / #ff3d52 | #b84dff / #b84dff | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 12 | terminal | magenta | terminal/magenta | #ec4899 / #ec4899 | #f472b6 / #f472b6 | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 13 | terminal | orange | terminal/orange | #ff7a3d / #ff7a3d | #ffb84d / #ffb84d | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 14 | terminal | amber | terminal/amber | #ffb84d / #ffb84d | #ffd86b / #ffd86b | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 15 | terminal | emerald | terminal/emerald | #34d08c / #34d08c | #5ee6b8 / #5ee6b8 | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 16 | terminal | matrix | terminal/matrix | #00ff88 / #00ff88 | #39ff14 / #39ff14 | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 17 | terminal | cyan | terminal/cyan | #5eddf2 / #5eddf2 | #7dd3fc / #7dd3fc | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 18 | terminal | violet | terminal/violet | #9d4edd / #9d4edd | #c77dff / #c77dff | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 19 | terminal | lime | terminal/lime | #aaff00 / #aaff00 | #00ff88 / #00ff88 | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 20 | terminal | rose | terminal/rose | #ff7a8a / #ff7a8a | #ffb3c1 / #ffb3c1 | #000000 / #000000 | #e8e8e0 / #e8e8e0 | rgba(232,232,224,0.52) | PASS |
| 21 | geist | crimson | geist/crimson | #ff3d52 / #ff3d52 | #b84dff / #b84dff | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 22 | geist | magenta | geist/magenta | #ec4899 / #ec4899 | #f472b6 / #f472b6 | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 23 | geist | orange | geist/orange | #ff7a3d / #ff7a3d | #ffb84d / #ffb84d | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 24 | geist | amber | geist/amber | #ffb84d / #ffb84d | #ffd86b / #ffd86b | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 25 | geist | emerald | geist/emerald | #34d08c / #34d08c | #5ee6b8 / #5ee6b8 | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 26 | geist | matrix | geist/matrix | #00ff88 / #00ff88 | #39ff14 / #39ff14 | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 27 | geist | cyan | geist/cyan | #5eddf2 / #5eddf2 | #7dd3fc / #7dd3fc | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 28 | geist | violet | geist/violet | #9d4edd / #9d4edd | #c77dff / #c77dff | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 29 | geist | lime | geist/lime | #aaff00 / #aaff00 | #00ff88 / #00ff88 | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 30 | geist | rose | geist/rose | #ff7a8a / #ff7a8a | #ffb3c1 / #ffb3c1 | #000000 / #000000 | #fafafa / #fafafa | rgba(250,250,250,0.52) | PASS |
| 31 | brutalist | crimson | brutalist/crimson | #ff3d52 / #ff3d52 | #b84dff / #b84dff | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 32 | brutalist | magenta | brutalist/magenta | #ec4899 / #ec4899 | #f472b6 / #f472b6 | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 33 | brutalist | orange | brutalist/orange | #ff7a3d / #ff7a3d | #ffb84d / #ffb84d | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 34 | brutalist | amber | brutalist/amber | #ffb84d / #ffb84d | #ffd86b / #ffd86b | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 35 | brutalist | emerald | brutalist/emerald | #34d08c / #34d08c | #5ee6b8 / #5ee6b8 | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 36 | brutalist | matrix | brutalist/matrix | #00ff88 / #00ff88 | #39ff14 / #39ff14 | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 37 | brutalist | cyan | brutalist/cyan | #5eddf2 / #5eddf2 | #7dd3fc / #7dd3fc | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 38 | brutalist | violet | brutalist/violet | #9d4edd / #9d4edd | #c77dff / #c77dff | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 39 | brutalist | lime | brutalist/lime | #aaff00 / #aaff00 | #00ff88 / #00ff88 | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 40 | brutalist | rose | brutalist/rose | #ff7a8a / #ff7a8a | #ffb3c1 / #ffb3c1 | #000000 / #000000 | #f5f5f0 / #f5f5f0 | rgba(245,245,240,0.52) | PASS |
| 41 | swiss | crimson | swiss/crimson | #ff3d52 / #ff3d52 | #b84dff / #b84dff | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 42 | swiss | magenta | swiss/magenta | #ec4899 / #ec4899 | #f472b6 / #f472b6 | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 43 | swiss | orange | swiss/orange | #ff7a3d / #ff7a3d | #ffb84d / #ffb84d | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 44 | swiss | amber | swiss/amber | #ffb84d / #ffb84d | #ffd86b / #ffd86b | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 45 | swiss | emerald | swiss/emerald | #34d08c / #34d08c | #5ee6b8 / #5ee6b8 | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 46 | swiss | matrix | swiss/matrix | #00ff88 / #00ff88 | #39ff14 / #39ff14 | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 47 | swiss | cyan | swiss/cyan | #5eddf2 / #5eddf2 | #7dd3fc / #7dd3fc | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 48 | swiss | violet | swiss/violet | #9d4edd / #9d4edd | #c77dff / #c77dff | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 49 | swiss | lime | swiss/lime | #aaff00 / #aaff00 | #00ff88 / #00ff88 | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |
| 50 | swiss | rose | swiss/rose | #ff7a8a / #ff7a8a | #ffb3c1 / #ffb3c1 | #000000 / #000000 | #fafaf8 / #fafaf8 | rgba(250,250,248,0.52) | PASS |

## Shell geometry resolved on the same element

| viewport | --content-max | --shell-sidebar-w | --shell-header-h | --footer-pad |
|---|---|---|---|---|
| desktop1440 | 1240px | 280px | 60px | 48px 40px 32px |
| tablet800 | 1240px | 240px | 60px | 48px 40px 32px |
| mobile375 | 1240px | 280px | 56px | 48px 40px 32px |
