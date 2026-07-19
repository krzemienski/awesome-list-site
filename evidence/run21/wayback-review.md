# R4-066 — Wayback-link live-source review (Run21, July 19, 2026)

Finding: catalog contains web.archive.org snapshot URLs; audit asked for a live-source
review — repoint to the original if it is alive again, keep the snapshot otherwise.

Method: every `web.archive.org` URL in the catalog (14 total — the audit sampled 3 of
these) had its embedded original URL probed live (GET, browser UA, redirect: follow,
12s timeout) on July 19, 2026. Verdict rule: keep the snapshot unless the ORIGINAL URL
serves the original content at the original location.

| id | original URL (behind snapshot) | probe result | verdict |
|---|---|---|---|
| 185234 | businesswire.com …SEGMENTS2023 press release | 403 (hard bot-wall, content unreachable) | KEEP wayback |
| 185416 | businesswire.com …Common-Media-Library press release | 403 (same wall) | KEEP wayback |
| 185407 | dyte.io/blog/rtmp-webrtc-hls/ | 502 (dyte.io defunct post-acquisition) | KEEP wayback |
| 187178 | doc.quanteec.com/advanced-topics/drm/ | 502 (docs host down) | KEEP wayback |
| 185380 | inetsolutions.org/how-to-stream-video… | 404 (article removed) | KEEP wayback |
| 184843 | editframe.com/guides/integrating-ffmpeg… | 200 but redirects to editframe.com homepage — guide gone | KEEP wayback |
| 184792 | theiabm.org/bamproducts/online-caption-subtitle-toolkit/ | 200 but redirects to theiamt.org homepage — page gone | KEEP wayback |
| 184935 | thinkbrandedmedia.com/the-best-ai-tools… | 200 but redirects to homepage — article gone | KEEP wayback |
| 184942 | remoteproduction.com/the-best-resources… | 200 but redirects to ptzoptics.com homepage — article gone | KEEP wayback |
| 185017 | blendvision.com/en/blog/live-streaming-protocols-comparison | 200 but redirects to homepage — post gone | KEEP wayback |
| 185251 | harmonicinc.com/insights/blog/targeted-ads-innovations/ | 200 but redirects to mediakind.com homepage — content gone | KEEP wayback |
| 186442 | conviva.com/state-of-streaming/ | 200 but redirects to conviva.ai homepage — report page gone | KEEP wayback |
| 185053 | ultrahdforum.org/phasea-guidelines-description/ | 200 but redirects to uhdf.svta.org homepage — page gone | KEEP wayback |
| 185052 | ultrahdforum.org/phaseb-guidelines-description/ | 200 but redirects to uhdf.svta.org homepage — page gone | KEEP wayback |

Outcome: 14/14 KEEP. No original serves its content at the original URL any more —
5 are hard-dead (403/404/502) and 9 soft-vanish into unrelated homepages. Repointing
any of them would swap working archived content for a dead or generic page.
