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
| `ANTHROPIC_MODEL` | ❌ | sonnet tier | `server/ai/anthropicConfig.ts` (primary / orchestrator model) |
| `ANTHROPIC_DEFAULT_{HAIKU,SONNET,OPUS,FABLE}_MODEL` | ❌ | first-party ids | `server/ai/anthropicConfig.ts` (tier → model id) |
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
| `CONTACT_IP_HASH_SECRET` | ❌ (required once enabled) | – | `server/config.ts`, `server/routes/domains/contact.ts` |
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
automatically — do not override it on Replit/Railway/Vercel.

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
the database (`server/ai/configCrypto.ts`).

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
Required once `CONTACT_ENABLED=true`: without it the server logs an error at
boot, `/api/config` reports `form.available: false` with
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

### Production (self-hosted / Docker / Railway / Vercel)

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

## See also

- [SETUP.md](./SETUP.md) — development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) — platform deployment
- [API.md](./API.md) — API reference
