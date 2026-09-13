---
name: Pixel reference reconciliation
description: How required live content is handled when a frozen visual prototype lacks it
---

When required live links, accessibility presentation, or the official brand
mark differ from a frozen visual prototype, preserve them and reconcile only
those differences in the in-memory expected-capture adapter. Never remove
required product content or relax the pixel threshold to obtain a pass.

**Why:** The user explicitly chose reference reconciliation over matching the
prototype by deleting or relocating required footer content.

**How to apply:** Keep canonical structure and geometry authoritative; record
each adapter mutation, compare the full union canvas without masking/cropping,
and retain expected, actual, diff, and measured percentage evidence.