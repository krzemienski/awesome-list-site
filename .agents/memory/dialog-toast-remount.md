---
name: Toast on dialog error wipes dialog state
description: Firing toast() on a validation error inside admin dialogs remounts the tree and closes/wipes the dialog.
---
In the admin CRUD dialogs, calling `toast()` when create/edit validation fails triggered a re-render/remount that closed the dialog and discarded the user's typed input — the "dialog closes and loses my input on error" class of bug.

**Why:** Root cause of a whole class of admin-panel findings (taxonomy create/edit dialogs). The toast wasn't cosmetic — it was the state-destroyer.

**How to apply:** Inside dialogs, report errors with inline banners kept in the dialog's own state; reserve toasts for after successful close. Reset the inline error on open/reopen/cancel.
