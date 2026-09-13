# SubmitResource parity handoff

## Scope

`SubmitResource.tsx` now follows the canonical `SubmitPage` composition from
`awesome-list-site-ds/pages.jsx`:

- a 720px maximum content column;
- the `SUBMIT A RESOURCE` mono eyebrow with the plus mark;
- the `Add to the index` heading and canonical lede;
- one 28px-padded form card;
- title and URL rows, followed by the two-column category/tags row,
  description, and right-aligned Cancel/Submit actions.

The page imports its route-owned styles from
`client/src/styles/pages/submit.css`. That stylesheet consumes the existing
design-system tokens and keeps the shared shell and primitives untouched.

## Runtime contract retained

The existing React Hook Form provider, Zod resolver, auth/loading/error gates,
draft restore/autosave and cross-tab storage handling, duplicate-URL check,
API mutation, server field-error mapping, success state, discard confirmation,
and SEO head remain in place.

Existing automation hooks are retained, including:

- `input-title`, `input-url`, `input-description`, and `input-tags`;
- `select-category`, `select-subcategory`, and `select-subsubcategory`;
- `button-submit`, `button-cancel`, auth-state hooks, and discard-dialog hooks.

The taxonomy controls remain real API-backed fields. Subcategory and specific
topic controls render after a parent selection, so the empty state keeps the
canonical form's visual rhythm without dropping production fields.

## Unsupported field note

The canonical design/task mapping mentions a `notes` field, but the current
resource submission API has no contributor-notes field. The production payload
contains `title`, `url`, `description`, category/subcategory/sub-subcategory
names, and optional tags in `metadata`; bookmark/admin audit notes belong to
other backend records. A notes input was therefore not invented or silently
discarded in this page.

## Residual differences

No browser capture was run in this handoff. The following differences are
intentional or dependent on runtime state:

1. Production helper copy and RHF error text remain visible below controls;
   the static canonical demo omits those runtime messages.
2. Auth loading/login/error, duplicate URL, success, and discard-dialog states
   are production-only surfaces absent from the default canonical demo state.
3. The production Select/React Hook Form controls retain their accessibility,
   validation, and touch-target behavior rather than becoming native static
   demo controls.
4. Header/sidebar/footer geometry is owned by the shared shell and is outside
   this page handoff.
