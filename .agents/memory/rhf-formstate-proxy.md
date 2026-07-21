---
name: react-hook-form formState Proxy subscription
description: formState fields (isDirty etc.) must be read during render to be tracked; first read inside an event handler returns a stale default.
---

**Rule:** With react-hook-form, `form.formState` is a Proxy that only tracks fields you READ during render. Destructure what you need at render time (`const { isDirty } = form.formState;`) and use that variable in handlers. Reading `form.formState.isDirty` for the first time inside a click handler returns a stale `false` forever — the subscription was never enabled.

**Why:** A dirty-form Cancel confirmation silently never fired because `isDirty` was only referenced inside the onClick. The form was genuinely dirty; the Proxy just wasn't subscribed. tsc and casual testing can't catch it.

**How to apply:** Any time a handler branches on `formState.*` (isDirty, isValid, errors...), make sure that same field is also read in the component body during render. Same applies to `useFormState` selectors.
