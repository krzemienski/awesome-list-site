# Release report — awesome.video, 2026-10-12

This is the release-gate click-through of https://awesome.video, done signed out and as the owner admin. This task was the owner's go-ahead for one production admin session.

- **Production revision under test:** `/api/version` = `f9bba9b98dd42108f8fb88b8885bd0fa2b5b9d72` (the main HEAD at audit start).
- **Behaviour markers (both new in that revision):**
  - resource 185214 reports `kind: "tools"`, so the kind backfill is live;
  - `/api/home` returns 8 featured picks.
- **How it was checked:**
  - In the in-app browser (Replit's Playwright tester): every route, control and admin tab listed below, at 375×812, 768×1024, 1024×768 and 1440×900. Screenshot ids in the tables are that tester's captures.
  - `curl` for SEO tags, sitemap, robots and status codes.
  - SQL against the dev database for the dead-link list.
  - Before the owner said browser-only, a throwaway script loaded 39 routes × 4 widths on prod. All returned the expected status, with no overflow and no page errors (only the intended 404s logged 404 API reads). Those screenshots are in `proof/P-02/routes/`, which is gitignored.

Status key:
- **PASS:** exercised and behaved correctly.
- **FAIL:** a bug, fixed below.
- **UNVERIFIED:** not exercised.

## Bugs found and fixed

| # | Where | Bug | Fix | Prod re-check |
|---|---|---|---|---|
| 1 | `/submit` at 375 | Category and Tags sat side by side in two columns of about 118px. Category names and the "comma,separated" placeholder were cut off (tester shot `x1bir7`). The two-column row was copied from the desktop-only reference. | `client/src/styles/pages/submit.css`: the row stacks into one column at ≤560px. Wider screens keep two columns: 768 and 1024 re-checked side by side, shots `w7c5kg` and `igb91q`. | Verified on dev at 375. **Pending owner republish**; see "Prod re-check after republish" below. |

### Not bugs (investigated and closed)

- **`Cannot set properties of undefined (setting 'cssText')` on `/nope-xyz`.** Seen once, right after the tester opened `/sitemap.xml`, which is an XML document with no `.style`. It did not reproduce in a fresh context, opening `/nope-xyz` either directly or after `/about`, at 0 page errors. No site script assigns `.style.cssText`. It came from the tester's capture code running on the XML page.
- **`/bookmarks` "timed out" in the first admin run.** That was the tester's 45-second worker ceiling. On the re-run the page reached DOMContentLoaded in 109 ms and the list was ready in about 3.5 s, with no pending or failed API calls.
- **"Building your recommendations…" before the cards on `/recommendations` (signed in).** The 10 cards arrived within the poll. A signed-in Claude call takes about 9 s by design. The brief empty or guest state is already tracked as its own task.
- **A rejected submission in the owner's contributions titled `<script>alert(1)</script>`.** It renders as inert text, so escaping works. It is old QA data, not a defect.

## Logged-out sweep (prod)

Each cell gives the result and the tester shot id. Widths: 1440 / 1024 / 768 / 375.

| Route / control | 1440 | 1024 | 768 | 375 |
|---|---|---|---|---|
| Consent banner → Decline | PASS | PASS `31yyjr` | PASS `ycm8pb` | PASS `pfa8tv` |
| Home, Index layout: featured "Hand-picked highlights" + kind strip | PASS `c0x4it` | PASS `0fvvm8` | PASS `tzfxei` | PASS `cgj98k` `gl6qhp` |
| Kind chip Tools & SDKs → `?kind=tools` → second tap clears | PASS `xmrkrx` | PASS `2axyj1` `rmbdub` | PASS `9671g3` `5w2dyz` | PASS `93g4gr` (44px chips) |
| Home, Curated (`?layout=curated`): hero + featured grid | PASS `svk8yd` | PASS `6ttir7` `kiglci` | PASS `33v2hi` | PASS `3lvb7x` `i7js1k` |
| Category → subcategory → L3 (Encoding & Codecs › Codecs › AV1 → `/sub-subcategory/av1`, 22 resources) | PASS sidebar `nyuihe` | PASS rail `xss907` `jhwzmf` | PASS rail `o50n88` `3fjwin` | PASS drawer `rain29` `4mlbgq` `o5n0hp` `lh36ac` |
| `/category/encoding-codecs`, `/subcategory/codecs` | PASS `5oxxvb` `81budh` | PASS (scripted sweep) | PASS (scripted sweep) | PASS (scripted sweep) |
| ⌘K / header search "ffmpeg" (433 matches) → Enter → `/resource/185214` | PASS `3twov0` `kec855` | PASS `xggbi8` | PASS `pfrso5` | PASS `pihujv` |
| `/search?q=ffmpeg` results; `/search?q=zzzqqqnomatch` empty state → Browse categories | PASS `nz6n41` `0sdvxr` | PASS (scripted sweep) | PASS (scripted sweep) | PASS (scripted sweep) |
| Resource page: badges, Visit (`target=_blank` → ffmpeg.org) | PASS `cjewtu` `81jzze` | PASS `0xt19n` | PASS `pp8emz` | PASS `4gsf3r` |
| Guest Favorite → "Sign in to favorite" toast | PASS `777gu4` | — | — | PASS `389b5o` |
| Guest Bookmark → "Saved on this device", then undo | PASS `bu2f5f` `otgq8g` | — | — | — |
| Share → "Link copied" toast | — | — | — | PASS `nijuww` |
| `/journeys` (5 cards), `/journey/7` (6 steps + sign-in CTA) | PASS `3yd1m1` `jrqg4z` | PASS `gr5cf5` | PASS `8ep0fr` | PASS `9ejyud` `txee0x` |
| Guest `/submit`: "Login required", fields disabled | PASS `jb71xh` | PASS `igb91q` | PASS `w7c5kg` | **FAIL → fixed** (#1) `x1bir7` |
| `/settings/theme`: exactly Editorial + Geist; switch to Geist and back | PASS `765039` `cvmbyw` `58le8c` | PASS `rfy3nz` `p2c372` | PASS `z41sm9` `kksv1q` | PASS `p8op6m` `oa4wqw` `vzvoku` |
| Footer: About / Terms / Privacy / Code of Conduct / Sitemap | PASS `t0ztxv` `y8q0by` `j83bwo` `6t43t0` | PASS `ckb7ey` | PASS `opo2jc` | PASS `mfwpkz` `og4hv8` |
| Contact (About → GitHub issues link) | PASS `nzmvxx` | — | — | PASS `lhdgqa` |
| Sidebar footer "3,824 indexed · live" not ellipsized | — | PASS `30i8fj` | PASS `mvd8ha` | — |
| 404: `/nope-xyz`, `/resource/99999999` | PASS `attkkz` `j32lzw` | PASS `yq5vuf` | PASS `dd3z8f` | PASS `uie23n` |
| Horizontal overflow | none | none (scrollX 0) | none (768px) | none (375px, every page) |
| Page errors | 0 (see "Not bugs") | 0 | 0 | 0 |

"—" means the control was not repeated at that width. The behaviour is width-independent and was exercised at the widths shown. Treat the "—" cells as UNVERIFIED at those widths.

Other public routes from the scripted 4-width sweep, all 200 with no overflow or page errors:
- `/categories`, `/category/encoding-codecs/codecs`, `/tag`, `/tag/open-source`, `/resource/188015`;
- `/advanced`, `/explore`, `/continue-learning`, `/design-system`, `/sign-in`, `/sign-up`;
- signed-out views of `/recommendations`, `/bookmarks`, `/favorites`, `/profile`, `/admin`, `/notifications`, `/contributions`;
- the 404 routes `/category/nope` and `/collection/doesnotexist`.

## SEO, sitemap, robots (prod, curl)

| Check | Result |
|---|---|
| `/`, `/submit`, `/resource/185214`, `/category/encoding-codecs`, `/journeys`: 200, canonical, `index` robots, JSON-LD | PASS. The resource title is "FFmpeg — Awesome Video". |
| `/nope-xyz`, `/resource/99999999`: 404 status, `noindex`, title "Page Not Found — Awesome Video" | PASS |
| `robots.txt`: Allow `/`; Disallow `/api/`, `/admin`, `/profile`, `/bookmarks`… | PASS |
| `sitemap.xml`: 200 `application/xml`, 4,487 `<loc>` entries | PASS (also opened in the browser: a valid `<urlset>`) |

## Signed-in admin sweep (prod, owner admin, 1440)

Login was one attempt per session, two sessions in total, with no 429. The session ended with "Sign out" (never "Sign out all devices").

| Admin tab | Result | Observed | Shot |
|---|---|---|---|
| Overview `/admin` | PASS | 3,824 resources, 99 subcategories, 14 active users, 12 pending; charts loaded | `wcvqd4` |
| Approvals | PASS | 12 pending | `r0dl9d` |
| Edits | PASS | "No pending edits" | `k10zvi` |
| Enrichment | PASS | job history, queue idle (no job started) | `sdcdfc` |
| Researcher | PASS | latest 5 of 63 runs (no run started) | `2u8922` |
| Export | PASS | panels + last link-check (no export or backup run) | `cd122z` |
| Database | PASS | 41 tables, 66,027 rows, 32 migrations, 0 pending | `lemg7g` |
| Resources | PASS | featured count 8; Featured-only → 8 of 8, then clears; FFmpeg search narrows; Edit shows Kind override | `lyfa1q` `5gl6lg` `z7xlx6` `7v0vax` |
| Categories | PASS | 9 | `561a8f` |
| Subcategories | PASS | 99 | `4eupx9` |
| Sub-subcategories | PASS | 32 | `oz6x1w` |
| Users | PASS | 123 | `w6m9r9` |
| GitHub | PASS | repo + history; one old failed export, already tracked by its own task | `ytecjj` |
| Digests | PASS | transport available, queue 0 | `8ooa5i` |
| Link health | PASS | 3,809 healthy / 11 broken / 2 suspect | `qst6x5` |
| Audit log | PASS | 16,595 events, paginated | `n6ygfk` |
| Journeys | PASS | 5 journeys × 6 steps | `ssmj3k` |
| Research | PASS | 4 briefs | `4oog62` |

Member pages, signed in:

| Page | Result | Shot |
|---|---|---|
| `/profile` tabs: Overview, Favorites (2), Bookmarks (12), Submissions, Security (API keys list, one revoked key; no key created) | PASS | `wpcie3` `uy3aog` `43ejc0` `5zhhzj` `z524w3` |
| `/bookmarks` (12, ready in about 3.5 s) | PASS | `jwvfet` |
| `/favorites` → `/profile?tab=favorites` | PASS | `nhsilb` |
| `/contributions` | PASS | `gfvawj` |
| `/settings` notification preferences (viewed, unchanged) | PASS | `xs1zoi` |
| `/notifications` ("Nothing here yet") | PASS | `wt6k9c` |
| `/recommendations` (10 cards; Refresh not clicked) | PASS | `is3pz0` |
| `/journey/7` signed in (completed 6/6; not restarted) | PASS | `ob6m8l` |
| `/submit` signed in: form enabled | PASS | `fzp5e9` |

The signed-in sweep was run at 1440 only. The signed-in pages at 375, 768 and 1024 are **UNVERIFIED** on prod. Their layout uses the same shell and components that pass at those widths signed out, and they were covered on dev in the earlier sweep.

## Net-zero signed-in writes (prod)

| Write | Result | Restored state, confirmed |
|---|---|---|
| Favorite FFmpeg (185214) on → off | PASS, 2 → 3 → 2 | `gkf9hm` `00x3v6` `2cz25g` |
| Bookmark FFmpeg on → off (no notes) | PASS, 12 → 13 → 12 | `uhgsgm` `v2envo` `jcsvrt` |
| Feature resource 190152 on → off | PASS, 8 → 9 → 8. The featured set is still 184757, 185214, 185289, 185426, 185436, 185716, 185834, 186450 (also confirmed with `curl /api/home`). | `t1d9tw` `fj1o5x` `7emrcb` |
| Kind override on 190152: Automatic → Libraries → Automatic | PASS. "Stored override: Libraries", then "Automatic: Other". | `uvlhjd` `2x0c50` |
| Signed-in submit `__qa_audit_665_u59RXm` (id 190337) → deleted via the admin UI | PASS. Pending → deleted; `curl /api/resources/190337` returns 404, and it is gone from Approvals. | `57m6tj` `inn83l` `9rvkq3` `8wgy33` `y9bovc` |

Not done on prod by design:
- API key creation, because revoking leaves a residue row (verified on dev);
- the signed-in theme picker, because it writes server preferences;
- recommendation Refresh and AI job starts, because they are paid;
- "Sign out all devices".

The audit log keeps entries for the writes above; that is expected.

## Known dead outbound links (owner decision)

Checked 2026-10-12 with one request each from the workspace. Per the link-scan rules, a 403 from a datacenter IP may be a bot block, not a dead page.

| Resource | URL | Result now |
|---|---|---|
| 185408 Kaltura HTML5 Video Player | https://player.kaltura.com/ | TLS certificate error (curl 60) |
| 186560 MPlayer | http://www.mplayerhq.hu/ | 301 → https, then TLS certificate error. 186418 RTMPDump is on the same host. |
| 185129 Panopto Certified Video Capture Appliances | https://www.panopto.com/features/video-recording/video-capture-hardware/ | 403 |
| 185469 Haivision SRT Protocol Technical Overview (white paper) | https://www.haivision.com/resources/white-paper/srt-protocol-technical-overview/ | 403 |
| 185479 THEOplayer DRM Integration Guide | https://github.com/THEOplayer/documentation/blob/main/theoplayer/how-to-guides/04-drm/00-introduction.md | 404 |
| 185901 x265 wiki (Bitbucket) | https://bitbucket.org/multicoreware/x265_git/wiki/Home | 404 |
| 185379 How to Live Stream (Wedio) | https://academy.wedio.com/how-to-live-stream/ | Now redirects off-domain to https://www.wedio.com/en/learn/how-to-live-stream (200). Repoint, or drop. |
| 185555 CinePaint | http://www.cinepaint.org/ | DNS failure |
| 186011 MPEG point cloud compression | https://mpeg-pcc.org | Connection refused |

These need the owner's choice: replace the URL, archive or reject the resource, or keep it. Nothing was changed.

## Prod re-check after republish

| Item | Result |
|---|---|
| `/submit` at 375: Category and Tags stacked, placeholders readable | UNVERIFIED on prod. The fix was verified on dev at 375. It ships when this audit's changes reach main and the owner republishes; the prod re-check is tracked as a follow-up. |

Apart from that one item, the final pass found no open bugs on prod.
