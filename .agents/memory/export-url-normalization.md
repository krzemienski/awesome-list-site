---
name: Export strips trailing slashes from URLs
description: The awesome-list formatter removes trailing slashes, so slash-sensitive URLs can be live in the DB but dead in the export
---

The GitHub-export formatter strips trailing slashes from every resource URL (awesome-lint requirement) and percent-encodes parens.

**Why:** some hosts 404/403 the slashless variant of a path that is 200 with the slash — so a resource URL can pass the live Link Health scan yet fail the export awesome_bot check. Also explains "phantom" export failures for URLs that look fine in the DB.

**How to apply:** when an export link-check flags a URL that seems alive, first diff the exported URL against the stored one (trailing slash, encoding). Fix by storing a slash-insensitive URL (e.g. the page's canonical redirect target), not by patching the formatter. Also note the DB can hold near-duplicate resources differing only by trailing slash — search by title, not exact URL.

Related: awesome_bot's `--white-list` matches after URL decoding, so percent-encoded entries (e.g. paths with %20) never match — allowlist the bare domain instead.
