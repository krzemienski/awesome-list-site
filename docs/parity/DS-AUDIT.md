# Design-system artifact integration status

The docs generator and inventory handoff are integrated. Existing hash routes
continue to render the chapters; no duplicate router or font implementation was
added. Static generator/inventory checks pass. This is **not full pixel closure**.

Retained leaf measurements below use threshold 0.1 and maximum 0.5% difference.
They are historical evidence, not a fresh capture of the integration checkout.
See [original worklog](worklog/artifact-docs.md) and
[machine-readable images/results](evidence/artifact-docs/pixels.json).

| Chapter | 375 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|
| overview | 0.464 | 0.295 | 0.729 | 0.662 |
| principles | 2.858 | 0.469 | 0.721 | 0.575 |
| getting-started | 0.766 | 0.459 | 0.732 | 0.591 |
| tokens | 0.217 | 0.155 | 0.187 | 0.176 |
| theming | 0.581 | 0.454 | 0.800 | 0.662 |
| typography | 0.671 | 0.442 | 0.599 | 0.463 |
| color | 0.475 | 0.311 | 0.409 | 0.382 |
| spacing | 0.381 | 0.229 | 0.442 | 0.432 |
| motion | 0.321 | 0.202 | 0.259 | 0.241 |
| buttons | 2.523 | 1.647 | 1.893 | 1.380 |
| cards | 0.183 | 0.118 | 0.186 | 0.181 |
| forms | 1.703 | 1.030 | 1.269 | 0.946 |
| navigation | 0.341 | 0.218 | 0.374 | 0.306 |
| lists | 0.314 | 0.245 | 0.449 | 0.368 |
| flows | 0.357 | 0.248 | 0.421 | 0.387 |
| pages | 0.735 | 0.418 | 0.716 | 0.561 |
| data-density | 0.266 | 0.155 | 0.387 | 0.307 |
| integration | 0.201 | 0.201 | 0.438 | 0.415 |
| theming-app | 0.571 | 0.301 | 0.607 | 0.536 |
| a11y | 0.250 | 0.151 | 0.287 | 0.225 |
| checklist | 0.215 | 0.117 | 0.244 | 0.255 |

Percentages above 0.5 remain FAIL (27 of 84 measured cells). Font-request
differences and canonical 36px versus accessible 44px controls remain reported,
not waived. The separately proposed font-preview work is not silently included.
Working showcase/anatomy/integration navigation remains intact; no non-working
Markdown-download link was exposed. Final artifact docs pixel gates are open.