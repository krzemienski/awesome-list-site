# VG-2 — Real-Browser GA4 Validation Evidence

Run: 2026-07-05T23:55:31.843Z · Browser: pinned Chromium 1208 · Target: http://localhost:5000

**Result: 23/23 checks passed.**

## Event volume captured off the wire (`/g/collect`)

| Event | Count |
|---|---|
| `api_performance` | 13 |
| `form_start` | 2 |
| `generate_lead` | 1 |
| `page_engaged` | 14 |
| `page_view` | 8 |
| `performance` | 1 |
| `scroll` | 5 |
| `search` | 1 |
| `select_content` | 2 |
| `sign_up` | 1 |
| `theme_change` | 1 |
| `user_engagement` | 3 |

## Assertions

| Check | Result | Detail |
|---|---|---|
| GA4 gtag.js loaded and sent a /collect hit | ✅ PASS | 2 request(s) after warmup |
| page_view fired on landing | ✅ PASS | 1 page_view event(s) |
| landing page_view dl carries UTM | ✅ PASS | http://localhost:5000/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test |
| search fired after typing | ✅ PASS | 1 search event(s) |
| search debounced to a single event | ✅ PASS | expected 1, got 1 |
| search has search_term=encoding | ✅ PASS | encoding |
| search has numeric result_count | ✅ PASS | result_count=986 |
| select_content fired on resource detail view | ✅ PASS | 1 event(s) |
| select_content content_type=resource | ✅ PASS | resource |
| select_content has content_id | ✅ PASS | content_id=186811 |
| page_view fired on resource detail load | ✅ PASS | 1 new page_view |
| page_view fired on in-app SPA navigation | ✅ PASS | 2 page_view after SPA nav |
| page_engaged fired on navigation | ✅ PASS | 1 page_engaged |
| sign_up conversion fired | ✅ PASS | 1 sign_up |
| sign_up method=password | ✅ PASS | password |
| sign_up carries first-touch utm_source | ✅ PASS | newsletter |
| generate_lead conversion fired | ✅ PASS | 1 generate_lead |
| generate_lead content_type=resource_submission | ✅ PASS | resource_submission |
| generate_lead carries first-touch utm_source | ✅ PASS | newsletter |
| theme_change fired (best-effort) | ✅ PASS | 1 theme_change |
| no throwaway email in any GA payload | ✅ PASS | scanned all /collect requests |
| no password in any GA payload | ✅ PASS | scanned all /collect requests |
| no console errors during flows | ✅ PASS |  |

## Sample decoded events

```
page_view: {"dl":"http://localhost:5000/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test","dt":"Awesome Video — 1951+ curated video development resources","en":"page_view","ep.debug_mode":"true"}
page_engaged: {"dl":"http://localhost:5000/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test","dt":"Awesome Video — 1951+ curated video development resources","en":"page_engaged","ep.debug_mode":"true","_et":"1428"}
search: {"dl":"http://localhost:5000/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test","dt":"Awesome Video — 1951+ curated video development resources","en":"search","ep.debug_mode":"true","ep.search_term":"encoding","epn.result_count":"986","_et":"3132\r"}
select_content: {"dl":"http://localhost:5000/resource/186811","dt":"Galène — Awesome Video","en":"select_content","ep.debug_mode":"true","ep.content_type":"resource","ep.content_id":"186811","ep.content_name":"Galène","ep.content_category":"Infrastructure & Delivery\r"}
sign_up: {"dl":"http://localhost:5000/register","dt":"Create an Account — Awesome Video","en":"sign_up","ep.debug_mode":"true","ep.method":"password","ep.utm_source":"newsletter","ep.utm_medium":"email","ep.utm_campaign":"vg_test","_et":"583"}
generate_lead: {"dl":"http://localhost:5000/submit","dt":"Submit Resource | Awesome Video","en":"generate_lead","ep.debug_mode":"true","ep.content_type":"resource_submission","ep.category":"Community & Events","ep.utm_source":"newsletter","ep.utm_medium":"email","ep.utm_campaign":"vg_test","_et":"79\r"}
theme_change: {"dl":"http://localhost:5000/settings/theme","dt":"Theme Settings — Awesome Video","en":"theme_change","ep.debug_mode":"true","ep.theme_name":"Terminal","ep.theme_type":"system","_et":"1797\r"}
```

Raw payloads: `vg2-collect-raw.json` (26 requests) · Parsed: `vg2-events.json` (52 events)
Screenshots: `vg2-01-landing.jpg` … `vg2-06-submit.jpg`