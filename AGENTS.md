# awesome-list-site — Codex Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to the repo root — use the existing directories (`client/`, `server/`, `shared/`, `scripts/`, `tests/`, `docs/`)
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.Codex/settings.json` has `attribution.commit` set. The Codex Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Build & Test

- There are no test suites (owner rule, removed in b4040bfe; see replit.md). Verify changes in the real running app and API.
- ALWAYS verify build succeeds before committing

```bash
npm run build
```

Gates per change: `npm run build` (it runs `tsc --noEmit` before bundling) and `npx eslint <touched files>` with no new errors. Whole-repo `eslint .` fails on ~4.4k pre-existing type-strictness errors (and on gitignored `.claude/worktrees`), so lint only what you touch.

### Rule table

Each rule names what enforces it. When a correction repeats a rule whose enforcer says "nothing", raise it to a check in the same change.

| Rule | Enforced by |
|---|---|
| Code that fails the typecheck never ships. esbuild strips types, so a missing method used to bundle cleanly and crash at runtime. | `tsc --noEmit` inside `npm run build`, which `scripts/publish-build.sh` runs |
| The nav tree has one producer (`HomeNavRepository`) and one type (`shared/catalog-nav.ts`). Every node carries `totalResourceCount`: display it, never re-sum. Corpus-tree counts and the non-category README names come only from `shared/catalog-counts.ts` (`corpusTotalCount`, `countNestedGroups`, `isRealCategory`). | `tsc` (producer and consumers share `CatalogNav`; nav nodes have no `resources`) |
| User rows leave the API only through the `sanitizeUser` whitelist (`server/validation/inputs.ts`), never as raw `User` objects with `password`. | Nothing automatic: both user routes use it today. Treat a new user-returning route as a review item |

## Production QA conventions

- Audits sign in with the audit admin and audit member accounts, never the owner account.
- Any row a QA run creates has a title starting `[QA-qa-audit-<RUN_ID>]`, so `/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`) can find and delete it.
- Deploys go through the `replit-deploy` skill, including its pre-publish schema check.

## Deploy

- Production (https://awesome.video) deploys from GitHub `main` through `.claude/skills/replit-deploy/SKILL.md`. A deploy is done when `/api/version` equals `origin/main` and `/api/health/ready` returns 200.
- Known pitfalls (the empty "Published your App" commit, analytics turned off under `navigator.webdriver`, held-key radio checks) are in `replit.md` under "Deploy pitfalls".
