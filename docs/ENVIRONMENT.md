# Environment Variables

Complete reference for every environment variable read by this application. The
list below is grep-verified against `server/`, `shared/`, and `client/src/` — if
a variable is not documented here, the code does not read it.

- **Server/shared** variables are read via `process.env.*` at runtime.
- **Frontend** (`VITE_*`) variables are read by `server/config.ts` and, for a
  small subset, directly in the browser via `import.meta.env.*` (they are baked
  into the client bundle at build time, so they must be present when `vite build`
  runs).

There is no `.env.example` in the repo. Create a `.env` at the project root (it
is git-ignored) using the templates at the end of this file. On Replit, set
these in the **Secrets** pane instead of a file.

---

## Quick reference

| Variable | Required | Default | Read in |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | – | `server/db/index.ts`, `server/migrate.ts`, `server/replitAuth.ts` |
| `SESSION_SECRET` | ✅ | – | `server/replitAuth.ts` |
| `NODE_ENV` | ⚠️ recommended | `development` | `server/index.ts`, `server/replitAuth.ts` |
| `PORT` | ❌ | `5000` | `server/index.ts` |
| `ADMIN_PASSWORD` | ⚠️ (to seed admin) | – | `server/seed.ts`, `server/repositories/UserRepository.ts`, `scripts/reset-admin-password.ts` |
| `REPL_ID` | ❌ (Replit OAuth) | – | `server/replitAuth.ts`, `server/routes.ts` |
| `ISSUER_URL` | ❌ | `https://replit.com/oidc` | `server/replitAuth.ts` |
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
| `VITE_SITE_TITLE` | ❌ | `Awesome Go` | `server/config.ts` |
| `VITE_SITE_DESCRIPTION` | ❌ | see below | `server/config.ts` |
| `VITE_SITE_URL` | ❌ | `http://localhost:5000` | `server/config.ts`, client (`import.meta.env`) |
| `VITE_DEFAULT_THEME` | ❌ | `auto` | `server/config.ts` |
| `VITE_GA_MEASUREMENT_ID` | ❌ | – (empty) | `server/config.ts`, `client/src/lib/analytics.ts` |

The browser reads only three of these directly through `import.meta.env`:
`VITE_SITE_URL`, `VITE_GA_MEASUREMENT_ID`, and Vite's built-in `DEV` flag.

---

## Core (required to boot)

### `DATABASE_URL`
PostgreSQL connection string used by Drizzle ORM for all queries, by the boot
migrator, and by the `connect-pg-simple` session store. The server cannot start
without it.

```bash
# Local Postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/awesome_list"
# Neon (managed) — requires SSL
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/db?sslmode=require"
```

### `SESSION_SECRET`
Secret used to sign session cookies (`express-session`). Use a long random
string; changing it invalidates all existing sessions. Never commit it.

```bash
SESSION_SECRET="$(openssl rand -base64 32)"
```

---

## Runtime

### `NODE_ENV`
`development` | `production` | `test`. In `production` the boot migrator runs
before the server accepts traffic, cookies are hardened, and logging is reduced.
Defaults to `development`.

### `PORT`
HTTP port for the Express server. Defaults to `5000`. Most hosts set this
automatically — do not override it on Replit/Railway/Vercel.

---

## Admin bootstrap

### `ADMIN_PASSWORD`
Password for the seeded admin account (`admin@example.com`). On first boot (empty
DB) the server seeds the admin user; on every boot `syncAdminPasswordFromEnv()`
rotates the stored password to match this value if it changed. Must be at least 8
characters or seeding/reset is skipped. Also read by
`scripts/reset-admin-password.ts`.

---

## Replit authentication (optional)

Only needed when running the Replit OpenID Connect login flow. On Replit these
are provided by the platform; elsewhere the app uses local email/password auth
and neither is required.

### `REPL_ID`
Replit application ID used as the OIDC client ID and logout redirect.

### `ISSUER_URL`
OIDC issuer discovery URL. Defaults to `https://replit.com/oidc`.

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

---

## Templates

### Local development (`.env`)

```bash
# Required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/awesome_list"
SESSION_SECRET="change-me-use-a-long-random-string"

# Runtime
NODE_ENV="development"
PORT="5000"

# Seed / manage the admin account (admin@example.com)
ADMIN_PASSWORD="a-strong-admin-password"

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
SESSION_SECRET="a-long-random-secret"
NODE_ENV="production"
ADMIN_PASSWORD="a-strong-admin-password"

# Public URLs (match your domain)
PUBLIC_SITE_URL="https://your-domain.com"
VITE_SITE_URL="https://your-domain.com"
VITE_SITE_TITLE="Your Site Title"

# Optional integrations
# AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
# GITHUB_TOKEN="ghp_..."
# VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

On Replit, `DATABASE_URL`, `REPL_ID`, and `PORT` are provided automatically; set
`SESSION_SECRET`, `ADMIN_PASSWORD`, and any optional keys in the Secrets pane.

---

## Troubleshooting

- **Server won't start / "DATABASE_URL"** — set a valid PostgreSQL URL; Neon
  requires `?sslmode=require`.
- **Users logged out on every restart** — `SESSION_SECRET` is unset or changing
  between restarts; set a stable value.
- **AI features disabled** — set `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (and
  `AI_INTEGRATIONS_OPENAI_API_KEY` for embeddings).
- **GitHub sync failing** — set a token with repo scope and verify it hasn't
  expired.
- **Can't log in as admin** — set `ADMIN_PASSWORD` (≥ 8 chars) and re-run
  `tsx scripts/reset-admin-password.ts`, or restart to let
  `syncAdminPasswordFromEnv()` rotate it.

## See also

- [SETUP.md](./SETUP.md) — development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) — platform deployment
- [API.md](./API.md) — API reference
