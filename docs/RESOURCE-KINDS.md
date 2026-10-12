# Resource kinds

Every resource has a stored `kind`, which drives the kind strip on the home
page (Tools & SDKs, Libraries, Standards, Events, Protocols). Resources that
fit none of these are stored as `other`. The strip shows five chips, and the
`other` count is kept as screen-reader text, so the five chips plus `other`
add up to the catalog total.

## How a kind is decided

`shared/resourceKindClassifier.ts` is deterministic. It reads the resource's
category / subcategory / sub-subcategory, URL host and path, title,
description and tags. The first rule that matches wins:

1. **Events.** The resource is filed under a community or events branch
   (Community & Events, Community Groups, Events & Conferences), uses event
   wording ("conference", "meetup", "summit", "community call"…), or is on an
   event host (meetup.com, archive.fosdem.org, …).
2. **Software hosting.** GitHub, GitLab, npm, PyPI, crates, app stores and
   similar hosts are software. The resource is a **library** when its title,
   description or tags say SDK / library / framework / bindings / module /
   plugin or it sits under a library branch. Otherwise it is a **tool**.
3. **Specifications.** Spec hosts (IETF, ITU, ISO, W3C, SMPTE, …) and spec
   identifiers (RFC 1234, ISO/IEC 23009, SMPTE ST 2110, …) are **protocols**
   when filed under a protocols branch, and **standards** otherwise.
4. **Articles and learning material.** Blog posts, Medium posts, papers,
   recorded talks, webinars, podcasts, courses and tutorials are classed by
   subject: under a standards or protocols branch they take that kind,
   anywhere else they are `other`. No kind fits a blog post or a tutorial.
5. **Taxonomy defaults.** Standards and protocols branches give their kind.
   Tool branches (encoders, players, servers, analysis, …) give a tool or a
   library, using the same wording split as rule 2.
6. **Nothing matched.** `other`.

Expected misses: a few articles on unusual hosts end up as tools, a few
standards bodies' tools end up as standards, and taxonomy misfilings carry
through (for example CinePaint filed under Standards & Industry). Admins can
correct these one at a time.

## Where it is set

- **New resources.** `createResource` classifies any resource created without
  a kind. That covers member submissions, admin create, GitHub import, the
  research approval insert and seeding.
- **AI enrichment.** Enrichment classifies a resource only when its kind is
  still empty. It never replaces a stored kind.
- **Boot backfill.** On every server start, background initialization fills
  any row whose kind is still `NULL` (all statuses) and logs the before and
  after counts (`🏷️  Resource kind backfill: …`). The backfill only touches
  `kind IS NULL` rows and leaves `updatedAt` alone, so running it again
  changes nothing. Production is filled by its first boot after publishing.
- **Read-time fallback.** If a row somehow has no kind, the API still resolves
  one from tags and the config mappings (`shared/resourceKinds.ts`,
  `resource_kinds` in `awesome-list.config.yaml`). This fallback is no longer
  the normal path.

## Correcting a kind (admins)

Go to **Admin → Resources** and edit the resource. Choose the right kind under
**Kind**. It saves straight away, is recorded in the audit log, and the home
counts update once the catalog cache refreshes.

- Choose **Automatic — X** to throw away a manual choice and store the
  classifier's current answer X again. The audit row says "reset to
  automatic".
- Editing title, URL or category later does **not** reclassify a stored kind.
  To re-run the classifier after a big edit, pick Automatic.
- The admin form shows Automatic whenever the stored kind matches what the
  classifier would choose, so "Automatic" and a manual pick of the same kind
  look the same.

## Before / after (2026-10-12)

| | tools | libraries | standards | events | protocols | other |
|---|---|---|---|---|---|---|
| Prod before (stored NULL, tag fallback) | 23 | 62 | 47 | 18 | 11 | 3,663 |
| Dev after backfill (1,816 approved) | 906 | 332 | 138 | 82 | 64 | 294 |
| Prod projection (3,824 approved, read-only export) | 1,836 | 745 | 278 | 142 | 124 | 699 |

Most of what remains in `other` on prod is introductory material, articles and
papers (Intro & Learning, plus how-to articles filed under tool categories).
