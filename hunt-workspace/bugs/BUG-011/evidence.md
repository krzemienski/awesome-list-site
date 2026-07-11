# BUG-011 — /submit form has method="get" and an aria-hidden empty SELECT

**Severity:** MEDIUM (functional + a11y)
**Affected page:** https://awesome.video/submit

## Reproduction
1. Open https://awesome.video/submit in a fresh chromium at 1440×900.
2. Inspect the form: `<form action="https://awesome.video/submit" method="get" ...>`. Submissions will put the entry into the URL query string, exposing partial data in browser history and analytics, and breaking server-side handling for non-trivial payloads.
3. The form has a SELECT child with `aria-hidden="true" class=""` — the SELECT is interactive but invisible to assistive tech. Any user picking an option will succeed silently while screen-reader users get nothing.

```bash
curl -s https://awesome.video/submit | grep -i '<form\|<select' | head -10
```

## Expected
- The form should be `method="post"` for submission (data includes long descriptions, multiple tags, etc.).
- Interactive elements inside an `aria-hidden="true"` subtree must be excluded or promoted out.

## Actual
The single form on the submit page uses `method="get"`, and a `<select>` is hidden from accessibility tree.

## Evidence
- bug-deep-hunt.json, `submit.formFields[0]`:
  `{"action":"https://awesome.video/submit","method":"get","fields":["title","url","description","","tags"]}`
- bug-deep-hunt.json, `submit.ariaHiddenInputs[0]`:
  `{"tag":"SELECT","role":null,"text":"","cls":""}`
- `screenshots/submit.png` + `submit_form.png`

## Fix prompt

```
Task: Fix the submission form on https://awesome.video/submit:
  (1) It currently uses method="get" with fields
      [title, url, description, "", tags]. Submissions leak query data
      and are size-limited. Switch to method="post".
  (2) A <select> descendant of an aria-hidden=true subtree is still
      interactive; remove aria-hidden from this select, or move it out
      of the hidden region, or hide the entire region with display:none
      while keeping content out of the form.

Reproduction: load /submit, evaluate
  document.querySelector('form').method  // "get"
  document.querySelectorAll('[aria-hidden] select').length  // ≥1

Acceptance:
1. document.querySelector('form').method === "post"
2. No <select> inside an element with aria-hidden=true.
3. Submitting the form POSTs to /submit and renders either a confirmation
   page or a validation error response.
```
