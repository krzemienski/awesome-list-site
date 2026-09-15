# Production visitor reference — Task 568

**Origin:** `https://awesome.video`  
**Run:** 2026-09-14T22:25:31Z–22:28:04Z  
**Mode:** anonymous/read-only. The production-baseline browser guard blocked
all non-`GET`/`HEAD`/`OPTIONS` HTTP requests, sealed WebSocket/worker/popup and
service-worker constructors, and the browser was closed before these artifacts
were copied. No production write was attempted.

| Step | 375 route / visible controls | 1440 route / visible controls |
| --- | --- | --- |
| Home | `/` / 29 | `/` / 213 |
| Drawer | `/` / 214 | n/a (desktop sidebar) |
| Category | `/category/encoding-codecs` / 428 | same / 452 |
| Subcategory | `/subcategory/codecs` / 182 | same / 391 |
| Resource | `/resource/186371` / 30 | same / 217 |
| Tag | `/tag/rtmp` / 272 | same / 457 |
| Search | `/search?q=video` / 167 | same / 517 |
| About | `/about` / 23 | same / 208 |
| Legal | `/terms` / 16 | same / 201 |
| Sign-in | `/sign-in` / 25 | same / 210 |

All routes above loaded through the visitor UI except that the initially chosen
resource had no tags. The reference therefore navigated to the known public
tagged resource `185020` and clicked its tag to exercise the tag route. At
375 the drawer was used for category/subcategory navigation.

## Result

* Main-document home status: **200** at both widths.
* Browser request failures and console errors: **0** at both widths.
* Browser-wide non-safe HTTP refusals: **0**; context request refusals: **0**.
* The sealed worker guard refused two Clerk blob workers at each width. This
  caused ten duplicate Clerk warnings per width: “Cannot create worker from
  blob…”. The blob locations have been redacted in the JSON evidence.
* Consent was visibly present and declined through the product UI at both
  widths.

Screenshots and the full per-element census are in
`production/`; `production-visitor.json` is the machine-readable log. This is
a reference pass only: it intentionally contains no sign-in, submit, admin, or
other production mutation.
