---
name: Declared fonts versus rendered heading parity
description: Identical served heading files can still fail whole-document font-declaration parity when a canonical request adds an unused family.
---

**Rule:** Distinguish equality of actually used heading files from equality of
every declared font face. Neither proves the other.

**Why:** The canonical live font request contains a body family omitted by the
frozen docs request. Served heading files matched, but whole-document
family/style/weight comparison still rejected the additional body declarations.
Switching to the narrower sheet hid that discrepancy while violating the
explicit live/artifact canonical-request requirement.

**How to apply:** Inspect request equality, declared-face sets, loaded faces and
rendered heading weights separately. Record a contract/reference conflict rather
than narrowing the request or waiving a gate. Loaded-font checks are not
first-paint or no-flash evidence.