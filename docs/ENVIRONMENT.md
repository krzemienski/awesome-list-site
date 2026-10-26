# Environment Variables

Canonical, categorized reference for supported application and durable-script
configuration. Executable reads in `server/`, `client/`, `scripts/`, and
deployment configuration remain authoritative.

- **Server/shared** variables are read via `process.env.*` at runtime.
- **Frontend** (`VITE_*`) variables are baked into the client bundle at build
  time through `server/config.ts` and/or direct `import.meta.env.*` reads.

There is no `.env.example` in the repo. Create a `.env` at the project root (it
is git-ignored) using the templates at the end of this file. On Replit, set
these in the **Secrets** pane instead of a file.

---

## Quick reference

| Variable | Required | Default | Read in |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | – | `server/db/index.ts`, `server/migrate.ts` |
| `CLERK_PUBLISHABLE_KEY` | ✅ server | – | `server/index.ts` |
| `CLERK_SECRET_KEY` | ✅ server | – | Clerk middleware/proxy and validation scripts |
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ build | – | `client/src/App.tsx` |
| `VITE_CLERK_PROXY_URL` | ❌ | direct Clerk | `client/src/App.tsx` |
| `NODE_ENV` | ⚠️ recommended | `development` | server, build, and scripts |
| `PORT` | ❌ | `5000` | `server/index.ts` |
| `REPL_ID` | ❌ | – | `vite.config.ts` (Replit development plugins only) |
| `ADMIN_PASSWORD` | ❌ (audits) | – | audit-key middleware and preflight scripts |
| `AWESOME_RAW_URL` | ❌ | avelino/awesome-go README | `server/config.ts`, `server/routes.ts` |
| `SITE_URL` | ❌ | request host | `server/routes.ts` |
| `PUBLIC_SITE_URL` | ❌ | `https://awesome.video` | `server/index.ts`, `server/og-middleware.ts` |
| `WEBSITE_URL` | ❌ | `https://awesome.video` | `server/github/syncService.ts` |
| `ANTHROPIC_BASE_URL` | ❌ (AI router) | – | `server/ai/anthropicConfig.ts` (all Claude calls + Agent SDK env) |
| `ANTHROPIC_AUTH_TOKEN` | ❌ (with base URL) | – | `server/ai/anthropicConfig.ts` |
| `ANTHROPIC_MODEL` | ❌ (✅ for Researcher) | sonnet tier; none for Researcher | `server/ai/anthropicConfig.ts` (primary / orchestrator model), `server/ai/researchRunConfig.ts` |
| `ANTHROPIC_DEFAULT_{HAIKU,SONNET,OPUS,FABLE}_MODEL` | ❌ (HAIKU ✅ for Researcher) | first-party ids; none for Researcher scouts | `server/ai/anthropicConfig.ts` (tier → model id), `server/ai/researchRunConfig.ts` |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | ❌ (AI features) | – | `server/ai/anthropicConfig.ts` |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | ❌ | Anthropic default | `server/ai/anthropicConfig.ts` |
| `ANTHROPIC_API_KEY` | ❌ (fallback) | – | `server/ai/anthropicConfig.ts` |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ❌ (embeddings) | – | `server/ai/embeddingService.ts` |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | ❌ | OpenAI default | `server/ai/embeddingService.ts` |
| `OPENAI_API_KEY` | ❌ | – | `server/ai/embeddingService.ts`, `server/config.ts` |
| `CONFIG_ENCRYPTION_KEY` | ❌ (AI agent config) | – | `server/ai/configCrypto.ts`, `server/ai/agentRuntime.ts` |
| `GITHUB_TOKEN` | ❌ (GitHub sync) | – | `server/github/client.ts`, `server/github/replitConnection.ts` |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | ❌ | – | `server/github/client.ts`, `server/github/replitConnection.ts` |
| `GITHUB_PUSH_TOKEN` | ❌ | – | `server/github/client.ts`, `server/github/replitConnection.ts` |
| `GITHUB_REPO_URL` | ❌ | – | `server/routes.ts` |
| `EXPORT_LINK_CHECK` | ❌ | – | GitHub export/link-gate code |
| `VITE_SITE_TITLE` | ❌ | `Awesome Go` | `server/config.ts` |
| `VITE_SITE_DESCRIPTION` | ❌ | see below | `server/config.ts` |
| `VITE_SITE_URL` | ❌ | `http://localhost:5000` | `server/config.ts`, client (`import.meta.env`) |
| `VITE_DEFAULT_THEME` | ❌ | `auto` | `server/config.ts` |
| `VITE_GA_MEASUREMENT_ID` | ❌ | – (empty) | `server/config.ts`, `client/src/lib/analytics.ts` |
| `VITE_AMPLITUDE_API_KEY` | ❌ | – | Amplitude browser analytics |
| `VITE_MIXPANEL_TOKEN` / `MIXPANEL_TOKEN` | ❌ | – | Mixpanel browser/server analytics |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | ❌ | – | PostHog browser analytics |
| `CONTACT_ENABLED` | ❌ | unset (form off, `POST /api/contact` → 404) | `server/config.ts`, `server/routes/domains/contact.ts` |
| `CONTACT_IP_HASH_SECRET` | ❌ (derived from `SESSION_SECRET` when unset) | – | `server/config.ts`, `server/routes/domains/contact.ts` |
| `CONTACT_EMAIL` | ❌ | YAML `contact.email` (empty) | `server/config.ts` |
| `CONTACT_ISSUES_URL` | ❌ | YAML `contact.issues_url` (empty) | `server/config.ts` |
| `CONTACT_DISCUSSIONS_URL` | ❌ | YAML `contact.discussions_url` (empty) | `server/config.ts` |
| `CONTACT_DISCUSSIONS_VERIFIED` | ❌ | YAML `contact.discussions_verified` (`false`) | `server/config.ts` |

Only `VITE_*` values are exposed to the browser, and they are fixed when the
Vite bundle is built. Never put a server secret in a `VITE_*` variable.

---

## Core (required to boot)

### `DATABASE_URL`
PostgreSQL connection string used by Drizzle ORM and the production boot
migrator. The server cannot start without it.

```bash
# Local Postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/awesome_list"
# Neon (managed) — requires SSL
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/db?sslmode=require"
```

### Clerk keys

Clerk owns credentials, sign-in/sign-up UI, password reset, cookies, and session
revocation in every environment:

- `VITE_CLERK_PUBLISHABLE_KEY`: public browser key, required at build time.
- `CLERK_PUBLISHABLE_KEY`: server middleware publishable key.
- `CLERK_SECRET_KEY`: server-only backend key.
- `VITE_CLERK_PROXY_URL`: optional browser proxy path, commonly `/api/__clerk`.

There is no `SESSION_SECRET`, Express session store, local password login, or
Replit-OIDC authentication mode.

---

## Runtime

### `NODE_ENV`
`development` | `production` | `test`. In `production` the boot migrator runs
before the server accepts traffic and the built frontend is served from
`dist/public`. Defaults to `development`.

### `PORT`
HTTP port for the Express server. Defaults to `5000`. Most hosts set this
automatically — do not override it on Replit/Railway.

---

## Admin access and audit automation

To make an account an admin, sign in once through Clerk, then set `role =
'admin'` on the corresponding `users` row.

`ADMIN_PASSWORD` is an optional audit-only secret. When it is configured,
database seeding creates a fixed legacy admin row for the
`X-Admin-Audit-Key` validation bypass. The key is compared from the environment
and is never stored as a user password; it does not enable local sign-in.
In development it belongs in the gitignored `.env` (loaded via `dotenv/config`
by both the server and the validation scripts) — never in `.replit`, which is
committed to the repository.
`REPL_ID` only enables Replit development-time Vite plugins.

For browser-based admin testing there is a durable QA admin account
(Clerk password sign-in, pre-provisioned `role = 'admin'` row bridged via
Clerk `external_id`). Its credentials live in the gitignored `.env` as
`TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`.

---

## Content source

### `AWESOME_RAW_URL`
Raw markdown URL of the awesome list used for parsing/import. Defaults to the
`avelino/awesome-go` README.

```bash
AWESOME_RAW_URL="https://raw.githubusercontent.com/user/repo/main/README.md"
```

---

## Public URLs & SEO

These control canonical links, sitemap URLs, Open Graph metadata, and GitHub
export metadata.

### `PUBLIC_SITE_URL`
Canonical public base URL used by the SEO/Open Graph middleware
(`server/og-middleware.ts`) and CORS allowlist (`server/index.ts`). Defaults to
`https://awesome.video`.

### `SITE_URL`
Base URL used in a subset of route responses; falls back to the incoming request
host when unset (`server/routes.ts`).

### `WEBSITE_URL`
Website URL embedded in GitHub export metadata
(`server/github/syncService.ts`). Defaults to `https://awesome.video`.

---

## AI services (optional)

AI features (Claude enrichment/recommendations, embeddings) are disabled unless
the relevant keys are present.

### `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`
Custom Anthropic-compatible router + bearer token. When both are set, **every**
Claude call (direct Messages API and the Researcher/Enrichment Agent SDK
subprocess) goes here and the managed/direct keys below are ignored. A base
URL with no credential disables AI (fail closed). See docs/AI-SERVICES.md.

### `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_{HAIKU,SONNET,OPUS,FABLE}_MODEL`
Model ids per tier (router ids look like `cc/claude-opus-5`); unset tiers use
first-party ids. `ANTHROPIC_MODEL` is the primary model (Researcher
orchestrator). Resolved in `server/ai/anthropicConfig.ts`.

**Researcher runs have no fallbacks** (`server/ai/researchRunConfig.ts`).
Unless an admin supplies a per-run override, a research launch requires
`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL` (orchestrator)
and `ANTHROPIC_DEFAULT_HAIKU_MODEL` (scouts run on the `haiku` alias, which
the Agent SDK maps through that variable). If one is missing, the launch is
refused with `400 { code: "missing_env" }` naming the variable, and the
Researcher launch dialog shows the same message. Check with
`GET /api/researcher/config` (admin).

Values in `.replit` `[userenv.shared]` (October 2026):
`ANTHROPIC_BASE_URL=https://router.hack.ski`, `ANTHROPIC_MODEL=cc/claude-opus-5`,
`ANTHROPIC_DEFAULT_OPUS_MODEL=cc/claude-opus-5`,
`ANTHROPIC_DEFAULT_SONNET_MODEL=cc/claude-sonnet-5`,
`ANTHROPIC_DEFAULT_HAIKU_MODEL=cc/claude-haiku-4-5-20251001`,
`ANTHROPIC_DEFAULT_FABLE_MODEL=cc/claude-fable-5`. The token is a secret.

Production, read-only (2026-10-25): the anonymous `GET https://awesome.video/api/health/ai`
returns only `{"status":"healthy"}`, so it confirms that a credential resolved
but not which endpoint or models. Only the owner can confirm the published
values. Signed in as admin, `GET /api/health/ai` returns `config` (endpoint
host and tier models), and after publishing `GET /api/researcher/config`
shows the researcher preflight. Today that route returns 404 in production
because it is not deployed yet.

### `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
Replit-managed Anthropic Claude key, used when no router is configured
(`server/ai/anthropicConfig.ts`).

### `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
Optional custom Anthropic base URL (proxy/self-host).

### `ANTHROPIC_API_KEY`
Direct Anthropic key, used when neither the router nor the managed integration
is configured (last in precedence; `server/ai/anthropicConfig.ts`).

### `AI_INTEGRATIONS_OPENAI_API_KEY`
OpenAI key used by the embedding service (`server/ai/embeddingService.ts`).

### `AI_INTEGRATIONS_OPENAI_BASE_URL`
Optional custom OpenAI base URL.

### `OPENAI_API_KEY`
OpenAI key; also used in `server/config.ts` as the on/off flag for the
`ai_tags` / `ai_descriptions` feature toggles.

### `CONFIG_ENCRYPTION_KEY`
Symmetric key used to encrypt/decrypt AI agent configuration secrets stored in
the database (`server/ai/configCrypto.ts`). Without it, any per-run override
token is refused (400), so Researcher/Enrichment overrides cannot be used.

---

## GitHub integration (optional)

Required only for GitHub import/export/sync. Any one of the token variables can
supply credentials; `replitConnection.ts` also resolves a token from the Replit
GitHub connector when running on Replit.

### `GITHUB_TOKEN` / `GITHUB_PERSONAL_ACCESS_TOKEN` / `GITHUB_PUSH_TOKEN`
GitHub Personal Access Tokens used by `server/github/client.ts`. Use a
fine-grained token scoped to the target repository. `GITHUB_PUSH_TOKEN` is used
for write/export operations.

### `GITHUB_REPO_URL`
Default repository URL used as a fallback for export operations
(`server/routes.ts`).

### `EXPORT_LINK_CHECK`
Set to `1` to enable live outbound-link checking during export. Leave unset for
the normal deterministic export path.

---

## Contact (optional, default off)

Backend for the five build-time contact variants (`docs/CONTACT-VARIANTS.md`).
With nothing set, `GET /api/config` reports every destination `available:
false` and `POST /api/contact` answers `404` — the deployment looks exactly like
one without the feature. Precedence for every value is env var (non-blank) >
`awesome-list.config.yaml` `contact:` block > built-in default, except the two
env-only switches below. Only the derived public destinations reach the client;
no `CONTACT_*` value is ever sent as-is.

### `CONTACT_ENABLED`
Environment-only; YAML can never turn the form on. Exactly `true` enables
`POST /api/contact` (validated, same-origin, 5 submissions/hour/IP, honeypot,
stored in `contact_submissions`). Anything else keeps it disabled.

### `CONTACT_IP_HASH_SECRET`
Environment-only HMAC key for the stored sender-IP hash (the raw address is
never written). At least 16 characters; shorter values are treated as unset.
Optional: when unset, the key is derived from `SESSION_SECRET`
(HMAC-SHA256 under a fixed purpose label). Only if neither is usable once
`CONTACT_ENABLED=true` does the server log an error at boot, `/api/config` reports `form.available: false` with
`"The contact form is not fully configured"`, and `POST /api/contact` answers
`503` instead of storing an unhashed address. Rotating the key only breaks
correlation between old and new rows.

### `CONTACT_EMAIL`
Public `mailto:` destination (for example `mailto:hello@example.com`). Anything
that is not a `mailto:` URL is reported unavailable.

### `CONTACT_ISSUES_URL`
Public `https:` issue-tracker URL. It is never derived from `source.url`; leave
it empty to keep the issues destination unavailable.

### `CONTACT_DISCUSSIONS_URL` / `CONTACT_DISCUSSIONS_VERIFIED`
Public `https:` GitHub Discussions URL, offered only when
`CONTACT_DISCUSSIONS_VERIFIED=true` as well (a repository without Discussions
enabled would otherwise get a dead link, which blocks variant `c`).

---

## Frontend (`VITE_*`)

Read by `server/config.ts` to build the site config, and baked into the client
bundle at build time. `VITE_SITE_URL` and `VITE_GA_MEASUREMENT_ID` are also read
directly in the browser.

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_SITE_TITLE` | Browser title, header, SEO | `Awesome Go` |
| `VITE_SITE_DESCRIPTION` | Meta description / Open Graph | `A curated list of awesome Go frameworks, libraries and software` |
| `VITE_SITE_URL` | Base URL for canonical/OG (also client-side) | `http://localhost:5000` |
| `VITE_DEFAULT_THEME` | Initial theme (`light` \| `dark` \| `auto`) | `auto` |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 ID (also client-side) | – |
| `VITE_AMPLITUDE_API_KEY` | Amplitude project key | – |
| `VITE_MIXPANEL_TOKEN` | Mixpanel public project token | – |
| `MIXPANEL_TOKEN` | Optional server-side Mixpanel token override | – |
| `VITE_POSTHOG_KEY` | PostHog project key | – |
| `VITE_POSTHOG_HOST` | PostHog ingestion host | provider default |

---

## Templates

### Local development (`.env`)

```bash
# Required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/awesome_list"
CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
VITE_CLERK_PUBLISHABLE_KEY="pk_..."
VITE_CLERK_PROXY_URL="/api/__clerk"

# Runtime
NODE_ENV="development"
PORT="5000"

# Optional: AI features
# AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
# AI_INTEGRATIONS_OPENAI_API_KEY="sk-..."
# CONFIG_ENCRYPTION_KEY="a-random-key"

# Optional: GitHub sync
# GITHUB_TOKEN="ghp_..."
# GITHUB_REPO_URL="https://github.com/user/repo"

# Optional: site/SEO + analytics
# PUBLIC_SITE_URL="http://localhost:5000"
# VITE_SITE_TITLE="Awesome Video"
# VITE_SITE_URL="http://localhost:5000"
# VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Production (self-hosted / Docker / Railway)

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
VITE_CLERK_PUBLISHABLE_KEY="pk_..."
VITE_CLERK_PROXY_URL="/api/__clerk"
NODE_ENV="production"

# Public URLs (match your domain)
PUBLIC_SITE_URL="https://your-domain.com"
VITE_SITE_URL="https://your-domain.com"
VITE_SITE_TITLE="Your Site Title"

# Optional integrations
# AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
# GITHUB_TOKEN="ghp_..."
# VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

On Replit, adding PostgreSQL supplies `DATABASE_URL`; set the Clerk keys and any
optional integration values in Secrets.

---

## Troubleshooting

- **Server won't start / "DATABASE_URL"** — set a valid PostgreSQL URL; Neon
  requires `?sslmode=require`.
- **Clerk UI fails to initialize** — ensure `VITE_CLERK_PUBLISHABLE_KEY` was
  present during the latest client build.
- **Authenticated API calls fail** — verify the server-side Clerk publishable
  and secret keys belong to the same Clerk instance as the browser key.
- **AI features disabled** — set `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (and
  `AI_INTEGRATIONS_OPENAI_API_KEY` for embeddings).
- **GitHub sync failing** — set a token with repo scope and verify it hasn't
  expired.
- **Can't access the admin panel** — sign in via Clerk, then confirm your user
  row has `role = 'admin'` in the database (password login was removed).

## Dependency refresh 2026-10-25

`npm update` took every dependency to the newest version its existing
`package.json` range allows. No range changed. Majors stayed out of scope.
Release notes were read for each runtime package between the old and the new
version. GH = github.com.

| Package | From → to | Release notes read | Effect on our code | Action |
|---|---|---|---|---|
| @radix-ui/react-tabs (+ roving-focus) | 1.1.17 → 1.2.1 | GH radix-ui/primitives `packages/react/tabs/CHANGELOG.md` (1.2.0, commit 82301b2c9) | A trigger now calls `focus()` on mousedown before activating. In automatic mode that focus also activates it, so one click called `onValueChange` twice. `/advanced` sent `tool_tab_opened` twice per click. | Fixed in `client/src/components/ui/tabs.tsx`: a repeat of the same value in the same task is dropped. One event per click after the fix. |
| zod | 4.4.3 → 4.6.7 | GH colinhacks/zod releases v4.5.0–v4.6.7; GHSA-mrhx-c7xc-m3w5 | Fixes a HIGH advisory (memory exhaustion from large arrays). `.nullable()` now becomes `type: [T, "null"]` in JSON Schema, which changes the tool schema `zodOutputFormat` builds at `server/ai/anthropicConfig.ts:313`. `.min`/`.max` now count code points. | Ran one real `/api/claude/analyze` call: 200, structured output parsed. Form messages are custom strings, so their wording is unchanged. |
| @clerk/react, @clerk/shared, @clerk/express | 6.14.1 → 6.18.1, 4.28.1 → 4.41.1, 2.1.55 → 2.1.83 | GH clerk/javascript `packages/{react,shared,express,backend}/CHANGELOG.md` | Passkey second factor (opt-in from the dashboard). `ClerkProvider` always supplies a router; we pass our own (`ClerkRuntime.tsx:157`). The backend rejects JWT-template tokens where a session token is expected; we only use session tokens. | None. Sign-in and sign-out driven in the browser. |
| posthog-js | 1.409.4 → 1.438.21 | GH PostHog/posthog-js `packages/browser/CHANGELOG.md` | INP/LCP attribution is now on by default. Replay is held until the first interaction. `reset()` warns about `opt_out_capturing_by_default`. We pin `defaults:'2025-05-24'` (`analytics-sdk-options.ts:65`), so the new defaults don't apply. | None. PostHog sends nothing from automation browsers. |
| mixpanel-browser | 2.81.0 → 2.84.0 | `node_modules/mixpanel-browser/CHANGELOG.md` | Adds an opt-in `hooks.on_track`. The opt-out flag is now honoured when it falls back to a cookie. | None. The `/track` body matches the old version, `surface` included. |
| @amplitude/unified (+ analytics-browser 2.48.1, analytics-core 2.61.0, session replay 1.51.5) | 1.1.28 → 1.1.43 | GH amplitude/Amplitude-TypeScript per-package `CHANGELOG.md` | Events with an empty type are dropped. Autocapture sees shadow DOM. Replay start/stop APIs. | None. `/2/httpapi` returns 200. |
| @tanstack/react-query | 5.101.2 → 5.104.5 | GH TanStack/query releases | `fetchQuery` is deprecated in favour of `query()` (we call it at `client/src/lib/legacy-readme-anchor.ts:64`). Defaults unchanged. | None now; migrate later. |
| react-hook-form, @hookform/resolvers | 7.81.0 → 7.91.0, 5.4.0 → 5.9.2 | GH react-hook-form releases; GH react-hook-form/resolvers releases | Bug fixes: `isSubmitting` no longer sticks; Zod v4 union and locale fixes. | None. `/submit` validation driven in the browser. |
| wouter | 3.10.0 → 3.13.0 | GH molefrog/wouter releases v3.11.0–v3.13.0 | Location subscribers are notified in one batch on popstate (#556), so `<Switch>` no longer re-renders the old route first. `useSearch`/`useLocation` unchanged. | None. Back steps through tab history once per entry. |
| other Radix (dialog, alert-dialog, dropdown-menu, select, popover, toast, tooltip, scroll-area, checkbox, switch, radio-group, slot, …) | minor bumps, e.g. dialog 1.1.19 → 1.3.1, select 2.3.3 → 2.4.1 | GH radix-ui/primitives `packages/react/<pkg>/CHANGELOG.md` | Fixes for nested non-modal layers; programmatic form changes no longer fire a bubbling `click`. Components no longer set `displayName`, so our wrappers copy `undefined` (only affects React DevTools names). All `--radix-*` CSS vars are still present. | None. Dialog focus trap, pointer lock, focus return, menu and select driven in the browser. |
| web-vitals | 6.2.1 → 6.2.3 | GH GoogleChrome/web-vitals `CHANGELOG.md` | INP memory-leak and LCP attribution fixes. | None |
| tailwindcss, @tailwindcss/vite, @tailwindcss/postcss | 4.3.2 → 4.3.3 | GH tailwindlabs/tailwindcss release v4.3.3 | The default sans stack changed; we override `--font-sans`. | None |
| openai, @modelcontextprotocol/sdk, ws, unist-util-visit, @replit/connectors-sdk | 6.46.0 → 6.49.0, 1.32.1 → 1.32.2, 8.21.0 → 8.22.0, 5.1.0 → 5.2.0, 0.4.1 → 0.4.3 | `openai` `CHANGELOG.md`; GH release pages; connectors-sdk npm tarball diff | Additive changes only. connectors-sdk takes the identity token from the local Replit endpoint on deployments. | None locally. Email and GitHub sync need a check on the published site. |
| tsx, input-otp, autoprefixer, postcss, typescript-eslint, prettier, playwright, wrangler | patch or dev-only bumps | Each project's releases or `CHANGELOG.md` | input-otp is not imported. Wrangler 4.152.0 still pins undici 7.29.1 (GHSA-xjj6-f33q-929c, HIGH, dev-only). | None |

The lockfile keeps Replit's `package-firewall.replit.internal` URL for every
entry whose version did not change. Changed entries resolve from
registry.npmjs.org.

### Major upgrades

Only the majors triaged as cheap. Release notes or migration guides were read
for each one, and the package source was read where the notes were thin.

| Package | From → to | Source read | Breaking changes | Effect on our code | Action |
|---|---|---|---|---|---|
| dotenv | 17.4.2 → 18.0.9 | GH motdotla/dotenv `CHANGELOG.md` (18.0.0–18.0.9); `dist/index.cjs` and `dist/config.cjs` in the 18.0.9 tarball | `.env.vault`/`DOTENV_KEY` removed; preloading (`node -r dotenv/config`) removed in favour of a `dotenv run` CLI; tips removed and the injected message moved to stderr; `import 'dotenv/config'` is quiet by default; `override` parsed with `parseBoolean` (the string `"false"` no longer means true); `DOTENV_*` env names added, `DOTENV_CONFIG_*` kept as fallbacks; opt-in `fast` parser; `~` expands in paths. | Override stays off by default: `populate()` writes a key already in `process.env` only when `override` is true. We load it with `import 'dotenv/config'` (`server/index.ts:1`, `vite.config.ts:2`, `scripts/run-digest-dispatch.ts:1`) and use no vault, no preload and no `dotenv_config_*` argv. Explicit `DATABASE_URL`, `PORT` and `ANTHROPIC_*` still win over `.env`. The package now installs a `dotenv` bin; no script calls one. | Upgraded. No code change. |
| express-rate-limit | 7.5.1 → 8.7.1 | `docs/reference/changelog.mdx` in GH express-rate-limit/express-rate-limit (8.0.0–8.7.1); `dist/index.mjs` validations | IPv6 clients are keyed by /56 subnet by default; new `ipKeyGenerator` helper; a custom `keyGenerator` that reads `req.ip` without it logs `ERR_ERL_KEY_GEN_IPV6`; validations run once each; unknown-option check; async store `init`. | `generateRateLimitKey` in `server/middleware/rateLimit.ts` read `req.ip`, so v8 logged `ERR_ERL_KEY_GEN_IPV6` twice at boot (free and standard tiers). The Postgres store (`pgRateLimitStore.ts`) still satisfies the `Store` interface. Each limiter keeps a distinct `prefix`, so `ERR_ERL_DOUBLE_COUNT` doesn't fire. Default-keyed limiters now group IPv6 clients by /56; IPv4 keys are unchanged. | Upgraded. The IP fallback now goes through `ipKeyGenerator`. |
| date-fns | 3.6.0 → 4.4.0 | `CHANGELOG.md` in the 4.4.0 tarball (v4.0.0–v4.4.0) | Type-level changes only; ESM-first; time-zone support via `in`; CDN scripts deprecated. | We only call `formatDistanceToNow(date, { addSuffix: true })` (Profile, ApiKeysCard, Contributions, ContinueLearning, ContinueLearningPreview). Output is unchanged. The unused `react-day-picker@8` declared a `date-fns ^2 \|\| ^3` peer; nothing imports it. | Upgraded. `react-day-picker` removed from `package.json` (0 importers). |
| js-yaml | 4.3.2 → 5.5.0 | GH nodeca/js-yaml `CHANGELOG.md` (5.0.0–5.5.0) and `docs/migrate_v4_to_v5.md` | No ESM default export; `load()` uses `CORE_SCHEMA` (no `!!timestamp`, `<<` merge or `!!binary` by default); `load('')` throws; `safeLoad`/`safeDump`, `DEFAULT_SCHEMA`, `types` and several dump options removed; ships its own types. | `import yaml from 'js-yaml'` type-checked (esModuleInterop) but the server died at boot: `SyntaxError: The requested module 'js-yaml' does not provide an export named 'default'`. `awesome-list.config.yaml` uses only strings, numbers, booleans and lists, so `CORE_SCHEMA` loads it unchanged. `scripts/export-openapi-yaml.ts` already used the named `dump` with options that still exist; v5 may quote some scalars differently the next time it runs. | Upgraded. Named `load` import in `server/config.ts` and `server/github/parser.ts`. `@types/js-yaml` removed. |
| tailwind-merge | 2.6.1 → 3.7.0 | GH dcastil/tailwind-merge `docs/changelog/v2-to-v3-migration.md` and `v3-changelog.md` | Tailwind 3 support dropped for Tailwind 4; theme keys renamed; `isLength` removed; `orderSensitiveModifiers` required in `createTailwindMerge`; prefix and separator config changes. | We only call `twMerge(clsx(...))` in `cn()` (`client/src/lib/utils.ts`) with no config. The class list of every element on home, resource, bookmark dialog, admin researcher guided view, contributions and profile was identical before and after at 1440, 820 and 390. | Upgraded. No code change. |
| nanoid | 5.1.16 (direct) | GH ai/nanoid `CHANGELOG.md` (6.0.0–6.0.2) | 6.0 drops Node 18 and 20 (`engines: ^22 \|\| ^24 \|\| >=26`); Replit runs `nodejs-20`. | Nothing imports `nanoid`; postcss uses its own nested `nanoid@3`. | Not upgraded. Removed from `package.json`. |
| @types/node | 20.16.11 → 20.19.43 | npm dist-tags; vite 7 `peerDependencies` | — | Stays on the Node 20 line that Replit runs (`.replit` `nodejs-20`), not latest (26.x). 20.19.x matches Vite 7's `^20.19.0 \|\| >=22.12.0` peer, which 20.16.11 failed (`npm ls` reported it invalid). | Upgraded, exact pin kept. |

Lockfile: 8 entries changed version, 4 were removed (`nanoid`,
`react-day-picker`, `@types/js-yaml`, and the copy of `express-rate-limit`
nested under `@modelcontextprotocol/sdk`, which now dedupes to the root), and
2 were added (`@eslint/eslintrc` keeps its own `js-yaml@4.3.2` and
`argparse@2.0.1`). All 156 `package-firewall.replit.internal` URLs on
unchanged entries were kept.

## See also

- [SETUP.md](./SETUP.md) — development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) — platform deployment
- [API.md](./API.md) — API reference
