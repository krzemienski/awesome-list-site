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
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | ❌ (AI features) | – | `server/ai/claudeService.ts` |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | ❌ | Anthropic default | `server/ai/claudeService.ts` |
| `ANTHROPIC_API_KEY` | ❌ (fallback) | – | `server/ai/claudeService.ts`, `server/ai/tagging.ts`, `server/ai/recommendations.ts`, `server/ai/agentRuntime.ts` |
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
`REPL_ID` only enables Replit development-time Vite plugins.

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

### `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
Preferred Anthropic Claude key for enrichment, recommendations, and URL/edit
analysis (`server/ai/claudeService.ts`).

### `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
Optional custom Anthropic base URL (proxy/self-host).

### `ANTHROPIC_API_KEY`
Fallback Anthropic key used when `AI_INTEGRATIONS_ANTHROPIC_API_KEY` is unset;
also read by the tagging, recommendations, and agent-runtime services.

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
