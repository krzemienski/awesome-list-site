# Section 00 — Branch Setup (Phase 0)

## Background

First phase of taking `awesome-list-site` off Replit, Dockerizing it, and auditing it. All work for this effort happens on a dedicated feature branch, never on `main`. Keeping `main` clean protects the deployable baseline while the migration is in progress and lets the whole effort be reviewed (or abandoned) as a single unit.

Each subsequent phase produces an atomic, conventional commit (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) scoped to that phase's work. Commit messages contain no AI attribution and no co-author trailers.

## Requirements

- A branch named `feat/dockerize-replace-replit` exists, created from `main`.
- That branch is the active (checked-out) branch before any later phase begins.

## Dependencies

- **Requires:** nothing.
- **Blocks:** section-01.

## Implementation steps

1. From `main`, create and switch to the working branch:
   ```bash
   git checkout main
   git checkout -b feat/dockerize-replace-replit
   ```
2. Confirm the active branch:
   ```bash
   git branch --show-current
   ```

## Validation gate VG-0 (blocking)

**Pass criteria:** `git branch --show-current` outputs exactly `feat/dockerize-replace-replit`.

Capture the evidence:
```bash
mkdir -p e2e-evidence/phase0
git branch --show-current | tee e2e-evidence/phase0/branch.txt
```

Gate fails (do not proceed to section-01) if `e2e-evidence/phase0/branch.txt` contains anything other than `feat/dockerize-replace-replit`.

## Acceptance criteria

- [ ] Branch `feat/dockerize-replace-replit` created from `main`.
- [ ] `git branch --show-current` outputs `feat/dockerize-replace-replit`.
- [ ] Evidence captured to `e2e-evidence/phase0/branch.txt`.

## Files to create/modify

None — git state only.
