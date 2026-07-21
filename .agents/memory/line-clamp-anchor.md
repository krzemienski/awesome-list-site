---
name: -webkit-line-clamp needs the clamp on the clipping ancestor
description: Why multi-line clamp silently fails when an inline-block child wraps the text
---
`-webkit-line-clamp` only clips text that is laid out directly by the element carrying the clamp (display:-webkit-box). If the clamped element merely *contains* an inline-block child (e.g. a `<h2>` inside a card-title `<a>`, or vice versa), the child establishes its own layout box and overflows unclipped — no error, the title just renders every line.
**Why:** Found during an audit fix — card titles clamped fine at some widths but showed 3+ lines at 1024–1279px because the clamp sat on the heading while the anchor child was inline-block.
**How to apply:** Put the `line-clamp-*` / `-webkit-box` styles on the element that directly wraps the text node (usually the anchor), and keep its children display:inline. Verify visually at multiple breakpoints, not just one.
