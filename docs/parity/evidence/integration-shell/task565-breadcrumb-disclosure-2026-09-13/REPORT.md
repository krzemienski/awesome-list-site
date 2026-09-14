# Task 565 resource breadcrumb disclosure — focused guest check

Run once against the restarted local public application at
`http://127.0.0.1:5000`. This is a focused functional/geometry check, not a
full pixel matrix and not a masked comparison.

## Method

- Fresh guest browser context at every width; no auth storage, request
  interception, fixture, or mock.
- Public route: `/resource/185020`.
- Actual executable script retained beside this report:
  `focused-guest-menu-check.mjs`.
- The script checks the real menu links, Escape focus return, document/body
  horizontal overflow, and closed/open/Escape geometry. It also verifies the
  trigger has no DOM instance outside its intended range.

## Result: PASS

| Width | Trigger/menu result | Geometry | Overflow / out-of-range result |
|---:|---|---|---|
| 768 | Real trigger rendered; menu contained real ancestor link `/category/protocols-transport` (“Protocols & Transport”); Escape returned focus to the trigger. | Visual trigger 20×20px; computed `::before` target 24×24px. Breadcrumb height 20px and H1 top 259.6px were unchanged closed → open → Escape. | No horizontal overflow: document/body/viewport width all 768px. |
| 1024 | Same real ancestor link and Escape focus result. | Visual trigger 20×20px; computed target 24×24px. Breadcrumb height 20px and H1 top 263.6px were unchanged closed → open → Escape. | No horizontal overflow: document/body/viewport width all 1024px. |
| 375 | Trigger not rendered in DOM. | Canonical breadcrumb height 20px; H1 top 403.4px. | No horizontal overflow: document/body/viewport width all 375px. |
| 1440 | Trigger not rendered in DOM. | Canonical breadcrumb height 20px; H1 top 263.6px. | No horizontal overflow: document/body/viewport width all 1440px. |

## Retained screenshots

- `breadcrumb-closed-768.png`
- `breadcrumb-open-768.png`
- `breadcrumb-closed-1024.png`
- `breadcrumb-open-1024.png`
- `breadcrumb-not-rendered-375.png`
- `breadcrumb-not-rendered-1440.png`

The open screenshots are viewport captures to preserve the open portal state;
the other captures are full page. No visual region was masked, cropped, or
post-processed.