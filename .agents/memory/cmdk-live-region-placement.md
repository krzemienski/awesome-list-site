---
name: cmdk live-region placement
description: Why result counts and announcements must not be children of a cmdk listbox
---

Keep live result-count announcements outside cmdk's listbox, even when they
visually accompany a result group.

**Why:** axe's required-child check treats a generic aria-live element nested
inside the listbox as an invalid child. An empty-palette check misses this:
the violation appears only after resource results populate.

**How to apply:** put counts in adjacent header/footer chrome and audit both
empty and populated query states. Do not remove live announcements or weaken
the accessibility check to make it pass.