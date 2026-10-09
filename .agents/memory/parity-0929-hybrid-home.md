---
name: 09-29 parity reference vs hybrid home
description: Why 09-29 parity home/shell rows diff, and harness rules for the reference's defaults and footer.
---
The app home is a hybrid: category list, heading and footer follow the 09-29 handoff, but it retains 09-10 components (stat strip, kind strip, RECENTLY INDEXED rail, CONTRIBUTE card, curated hero). Neither frozen reference alone matches; those blocks must be projected as retained extensions, not removed from the app.

The 09-29 prototype defaults homeLayout to "featured" while the app defaults to Index, so any reference row on "/" (palette, drawer) must switch the reference to Index first or the page under the overlay is another layout.

The 09-29 PageFooter is a fixed inline 4-column grid with no breakpoints (columns overlap below ~1100px); the harness projects the app's footer.css max-width blocks onto it.

**Why:** first 09-29 run showed 27-47% on every row; viewing PNGs showed all three causes, none were app regressions.
**How to apply:** when a 09-29 row fails big, view expected/actual before porting anything into client/.
