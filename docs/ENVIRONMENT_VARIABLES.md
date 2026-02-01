# Environment Variables Reference

Complete reference for all environment variables used in the Awesome Video Resource Viewer application.

## Overview

The application uses environment variables for configuration across different deployment environments (development, production, Replit). Variables are organized by service dependency and priority.

**Total Variables**: 24 (6 required, 18 optional)

---

## Quick Reference Table

| Variable | Required | Default | Service |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | - | Database |
| `SESSION_SECRET` | ✅ | - | Authentication |
| `REPL_ID` | ✅ (Replit) | - | Authentication |
| `NODE_ENV` | ⚠️ | `development` | Runtime |
| `PORT` | ❌ | `5000` | Runtime |
| `ISSUER_URL` | ❌ | `https://replit.com/oidc` | Authentication |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | ❌ | - | AI Services |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | ❌ | - | AI Services |
| `ANTHROPIC_API_KEY` | ❌ | - | AI Services (Legacy) |
| `OPENAI_API_KEY` | ❌ | - | Feature Flags |
| `GITHUB_TOKEN` | ❌ | - | GitHub Integration |
| `GITHUB_REPO_URL` | ❌ | - | GitHub Integration |
| `REPLIT_CONNECTORS_HOSTNAME` | ❌ | - | Replit GitHub |
| `REPL_IDENTITY` | ❌ | - | Replit GitHub |
| `WEB_REPL_RENEWAL` | ❌ | - | Replit GitHub |
| `AWESOME_RAW_URL` | ❌ | See below | Source Data |
| `WEBSITE_URL` | ❌ | `https://awesome-list.com` | SEO |
| `VITE_SITE_TITLE` | ❌ | `Awesome Go` | Frontend Config |
| `VITE_SITE_DESCRIPTION` | ❌ | See below | Frontend Config |
| `VITE_SITE_URL` | ❌ | `http://localhost:5000` | Frontend Config |
| `VITE_DEFAULT_THEME` | ❌ | `auto` | Frontend Config |
| `VITE_GA_MEASUREMENT_ID` | ❌ | - | Analytics |

---

## Database

### DATABASE_URL
**Required**: ✅ Yes
**Default**: None
**Format**: PostgreSQL connection string
**Example**:
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

**Description**: PostgreSQL database connection string used by Drizzle ORM for all database operations.

**Validation**:
- Must be a valid PostgreSQL connection string
- Must include authentication credentials
- Database must support SSL in production

**Used By**:
- `server/db/index.ts` - Database client initialization
- `server/replitAuth.ts` - Session store configuration
- `server/storage.ts` - Storage layer

**Replit**: Automatically set when PostgreSQL database is added to Repl.

---

## Runtime Configuration

### NODE_ENV
**Required**: ⚠️ Recommended
**Default**: `development`
**Values**: `development` | `production` | `test`
**Example**:
```bash
NODE_ENV="production"
```

**Description**: Determines the application runtime environment. Affects session security, logging, error handling, and build optimizations.

**Impact**:
- **Production**: Enables secure cookies, error suppression, optimized builds
- **Development**: Verbose logging, hot reload, detailed error messages

**Used By**:
- `server/index.ts` - Server configuration
- `server/replitAuth.ts` - Cookie security settings
- `server/routes.ts` - Error handling
- Vite build process

### PORT
**Required**: ❌ No
**Default**: `5000`
**Format**: Integer (1024-65535)
**Example**:
```bash
PORT="8080"
```

**Description**: Port number for the Express server. Automatically set by hosting platforms.

**Used By**:
- `server/index.ts` - Server startup

**Replit**: Automatically set by platform.

---

## Authentication

### SESSION_SECRET
**Required**: ✅ Yes
**Default**: None
**Format**: Random string (min 32 characters recommended)
**Example**:
```bash
SESSION_SECRET="your-super-secret-random-string-here-min-32-chars"
```

**Description**: Secret key for signing session cookies. Must be a strong, random string.

**Security**:
- ⚠️ **CRITICAL**: Never commit to version control
- ⚠️ Must be unique per environment
- ⚠️ Changing this invalidates all existing sessions

**Generation**:
```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Used By**:
- `server/replitAuth.ts` - Session middleware configuration

### REPL_ID
**Required**: ✅ Yes (when using Replit Auth)
**Default**: None
**Format**: String (Replit application ID)
**Example**:
```bash
REPL_ID="your-repl-id"
```

**Description**: Replit application identifier used for OpenID Connect authentication.

**Used By**:
- `server/replitAuth.ts` - OIDC client ID, logout redirect

**Replit**: Automatically set by platform.

### ISSUER_URL
**Required**: ❌ No
**Default**: `https://replit.com/oidc`
**Format**: URL
**Example**:
```bash
ISSUER_URL="https://replit.com/oidc"
```

**Description**: OpenID Connect issuer URL for Replit authentication.

**Used By**:
- `server/replitAuth.ts` - OIDC discovery

---

## AI Services

### AI_INTEGRATIONS_ANTHROPIC_API_KEY
**Required**: ❌ No (required for AI features)
**Default**: None
**Format**: String (Anthropic API key)
**Example**:
```bash
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Description**: Anthropic Claude API key for AI-powered features including resource enrichment, recommendations, and URL analysis.

**Features Enabled**:
- Resource enrichment (batch processing)
- Personalized recommendations
- URL content analysis
- Edit suggestion analysis

**Used By**:
- `server/ai/recommendations.ts` - Recommendation engine
- `server/ai/claudeService.ts` - Claude API client

**Security**:
- ⚠️ Never commit to version control
- ⚠️ Keep secure and rotate regularly

**Getting a Key**: [Anthropic Console](https://console.anthropic.com/)

### AI_INTEGRATIONS_ANTHROPIC_BASE_URL
**Required**: ❌ No
**Default**: None (uses Anthropic default)
**Format**: URL
**Example**:
```bash
AI_INTEGRATIONS_ANTHROPIC_BASE_URL="https://api.anthropic.com"
```

**Description**: Custom base URL for Anthropic API. Useful for proxies or custom endpoints.

**Used By**:
- `server/ai/recommendations.ts` - API client configuration
- `server/ai/claudeService.ts` - API client configuration

### ANTHROPIC_API_KEY
**Required**: ❌ No
**Default**: None
**Format**: String (Anthropic API key)
**Example**:
```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Description**: Legacy/alternative Anthropic API key. Falls back to this if `AI_INTEGRATIONS_ANTHROPIC_API_KEY` is not set.

**Used By**:
- `server/ai/tagging.ts` - Tagging service
- `server/ai/claudeService.ts` - Fallback API client

**Note**: Prefer `AI_INTEGRATIONS_ANTHROPIC_API_KEY` for new configurations.

### OPENAI_API_KEY
**Required**: ❌ No
**Default**: None
**Format**: String (OpenAI API key)
**Example**:
```bash
OPENAI_API_KEY="sk-..."
```

**Description**: OpenAI API key used as a feature flag to enable/disable AI features in the application configuration.

**Used By**:
- `server/config.ts` - Feature flags (`features.ai_tags`, `features.ai_descriptions`)

**Note**: Currently used only for feature detection, not actual API calls.

---

## GitHub Integration

### GITHUB_TOKEN
**Required**: ❌ No (required for GitHub sync)
**Default**: None
**Format**: GitHub Personal Access Token (PAT)
**Example**:
```bash
GITHUB_TOKEN="ghp_..."
```

**Description**: GitHub Personal Access Token for repository synchronization, import/export operations, and API access.

**Required Scopes**:
- `repo` - Full repository access
- `read:org` - Read organization data (if applicable)

**Features Enabled**:
- Import awesome lists from GitHub
- Export to GitHub (create PRs)
- Validate awesome-lint compliance

**Used By**:
- `server/github/client.ts` - GitHub API client

**Security**:
- ⚠️ Never commit to version control
- ⚠️ Use fine-grained tokens when possible
- ⚠️ Limit token scope to specific repositories

**Getting a Token**: [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)

### GITHUB_REPO_URL
**Required**: ❌ No
**Default**: None
**Format**: GitHub repository URL
**Example**:
```bash
GITHUB_REPO_URL="https://github.com/user/repo"
```

**Description**: Default GitHub repository URL for export operations. Used when creating PRs or exporting awesome lists.

**Used By**:
- `server/routes.ts` - Export operations (fallback)

### REPLIT_CONNECTORS_HOSTNAME
**Required**: ❌ No (Replit only)
**Default**: None
**Format**: Hostname
**Example**:
```bash
REPLIT_CONNECTORS_HOSTNAME="connectors.replit.com"
```

**Description**: Replit connectors API hostname for OAuth token management.

**Used By**:
- `server/github/replitConnection.ts` - GitHub connection via Replit

**Replit**: Automatically set when using Replit Connections.

### REPL_IDENTITY
**Required**: ❌ No (Replit only)
**Default**: None
**Format**: String (Replit identity token)
**Example**:
```bash
REPL_IDENTITY="..."
```

**Description**: Replit identity token for authenticating with Replit services.

**Used By**:
- `server/github/replitConnection.ts` - GitHub connection authentication

**Replit**: Automatically set by platform.

### WEB_REPL_RENEWAL
**Required**: ❌ No (Replit deployments)
**Default**: None
**Format**: String (deployment renewal token)
**Example**:
```bash
WEB_REPL_RENEWAL="..."
```

**Description**: Replit deployment renewal token. Alternative to `REPL_IDENTITY` for deployed Repls.

**Used By**:
- `server/github/replitConnection.ts` - GitHub connection authentication (fallback)

**Replit**: Automatically set for deployed applications.

---

## Source Data

### AWESOME_RAW_URL
**Required**: ❌ No
**Default**: `https://raw.githubusercontent.com/avelino/awesome-go/main/README.md`
**Format**: URL (raw GitHub content)
**Example**:
```bash
AWESOME_RAW_URL="https://raw.githubusercontent.com/user/repo/branch/README.md"
```

**Description**: URL to the raw markdown file of the awesome list to be displayed and managed.

**Used By**:
- `server/routes.ts` - Awesome list fetching
- `server/config.ts` - Source configuration

**Validation**:
- Must be a valid URL
- Must point to raw markdown content
- Must be publicly accessible

---

## Frontend Configuration

These variables are prefixed with `VITE_` and are embedded into the frontend build at build time.

### VITE_SITE_TITLE
**Required**: ❌ No
**Default**: `Awesome Go`
**Format**: String
**Example**:
```bash
VITE_SITE_TITLE="My Awesome List"
```

**Description**: Site title displayed in browser tab, SEO metadata, and header.

**Used By**:
- `server/config.ts` - Site configuration
- Client-side rendering

### VITE_SITE_DESCRIPTION
**Required**: ❌ No
**Default**: `A curated list of awesome Go frameworks, libraries and software`
**Format**: String
**Example**:
```bash
VITE_SITE_DESCRIPTION="A curated collection of amazing resources"
```

**Description**: Site description for SEO metadata and Open Graph tags.

**Used By**:
- `server/config.ts` - Site configuration
- SEO/OG image generation

### VITE_SITE_URL
**Required**: ❌ No
**Default**: `http://localhost:5000`
**Format**: URL
**Example**:
```bash
VITE_SITE_URL="https://awesome-list.example.com"
```

**Description**: Base URL of the site. Used for canonical URLs, sitemap generation, and Open Graph metadata.

**Used By**:
- `server/config.ts` - Site configuration
- SEO features

**Production**: Should match your actual domain.

### VITE_DEFAULT_THEME
**Required**: ❌ No
**Default**: `auto`
**Values**: `light` | `dark` | `auto`
**Example**:
```bash
VITE_DEFAULT_THEME="dark"
```

**Description**: Default theme for the application. `auto` respects user's system preference.

**Used By**:
- `server/config.ts` - Theme configuration
- Client-side theme initialization

### VITE_GA_MEASUREMENT_ID
**Required**: ❌ No
**Default**: None (empty string)
**Format**: Google Analytics Measurement ID
**Example**:
```bash
VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

**Description**: Google Analytics 4 measurement ID for usage tracking and analytics.

**Features Enabled**:
- Page view tracking
- Event tracking (resource clicks, searches, etc.)
- Analytics dashboard data

**Used By**:
- `server/config.ts` - Analytics configuration
- `client/src/lib/analytics.ts` - GA initialization
- `client/src/App.tsx` - Analytics setup

**Privacy**: Configured with IP anonymization and cookie consent by default.

**Getting a Measurement ID**: [Google Analytics](https://analytics.google.com/)

---

## SEO & Public URLs

### WEBSITE_URL
**Required**: ❌ No
**Default**: `https://awesome-list.com`
**Format**: URL
**Example**:
```bash
WEBSITE_URL="https://my-awesome-site.com"
```

**Description**: Public website URL for external links and GitHub sync metadata.

**Used By**:
- `server/github/syncService.ts` - Export metadata

---

## Environment-Specific Configuration

### Development (Local)

**Minimal `.env` file:**
```bash
# Database
DATABASE_URL="postgresql://localhost:5432/awesome_list"

# Session
SESSION_SECRET="dev-secret-change-in-production"

# Runtime
NODE_ENV="development"
PORT="5000"

# Optional: AI Features
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-api03-..."

# Optional: GitHub Sync
GITHUB_TOKEN="ghp_..."
```

### Production (Replit)

**Required variables** (most auto-set):
```bash
# Auto-set by Replit
DATABASE_URL="postgresql://..."
REPL_ID="..."
NODE_ENV="production"

# Must set manually
SESSION_SECRET="your-production-secret-here"

# Optional but recommended
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-api03-..."
GITHUB_TOKEN="ghp_..."
VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Production (Self-Hosted)

**All required variables:**
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"

# Runtime
NODE_ENV="production"
PORT="5000"

# Session
SESSION_SECRET="your-super-secret-random-string"

# Site Configuration
VITE_SITE_TITLE="Your Site Title"
VITE_SITE_URL="https://your-domain.com"
WEBSITE_URL="https://your-domain.com"

# Optional: AI & GitHub
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-api03-..."
GITHUB_TOKEN="ghp_..."
GITHUB_REPO_URL="https://github.com/user/repo"

# Optional: Analytics
VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

---

## Validation & Troubleshooting

### Check Required Variables
```bash
# Check if required variables are set
echo $DATABASE_URL
echo $SESSION_SECRET
```

### Test Database Connection
```bash
# Using psql
psql "$DATABASE_URL" -c "SELECT 1;"

# Using Drizzle Studio
npm run db:studio
```

### Verify AI Integration
```bash
# Test Claude API connection
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $AI_INTEGRATIONS_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Common Issues

#### Session Issues
**Problem**: Users logged out frequently
**Solution**: Ensure `SESSION_SECRET` is set and consistent across restarts

#### Database Connection Failed
**Problem**: Cannot connect to database
**Solution**:
1. Verify `DATABASE_URL` format
2. Check database is running
3. Verify network access and credentials

#### AI Features Not Working
**Problem**: Enrichment/recommendations disabled
**Solution**:
1. Set `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
2. Verify API key is valid
3. Check API quotas/limits

#### GitHub Sync Failing
**Problem**: Cannot import/export to GitHub
**Solution**:
1. Set `GITHUB_TOKEN` with correct scopes
2. Verify token hasn't expired
3. Check repository access permissions

---

## Security Best Practices

### DO ✅
- Use strong, random values for `SESSION_SECRET`
- Rotate API keys regularly
- Use fine-grained GitHub tokens
- Set `NODE_ENV=production` in production
- Use environment-specific `.env` files
- Enable HTTPS in production

### DON'T ❌
- Never commit `.env` files to version control
- Never log environment variables
- Never use development secrets in production
- Never share API keys publicly
- Never hardcode secrets in source code

### `.gitignore` Configuration
```gitignore
# Environment variables
.env
.env.local
.env.production
.env.development

# Keep example file
!.env.example
```

---

## Reference Implementation

### `.env.example`
Create this file in your repository as a template:

```bash
# =============================================================================
# Environment Variables Template
# Copy to .env and fill in your values
# =============================================================================

# -----------------------------------------------------------------------------
# Database (Required)
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# -----------------------------------------------------------------------------
# Session Security (Required)
# -----------------------------------------------------------------------------
SESSION_SECRET="generate-a-random-string-min-32-chars"

# -----------------------------------------------------------------------------
# Runtime
# -----------------------------------------------------------------------------
NODE_ENV="development"
PORT="5000"

# -----------------------------------------------------------------------------
# Replit Authentication (Required on Replit)
# -----------------------------------------------------------------------------
# REPL_ID="auto-set-by-replit"
# ISSUER_URL="https://replit.com/oidc"

# -----------------------------------------------------------------------------
# AI Services (Optional - enables AI features)
# -----------------------------------------------------------------------------
# AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-api03-..."
# AI_INTEGRATIONS_ANTHROPIC_BASE_URL="https://api.anthropic.com"

# -----------------------------------------------------------------------------
# GitHub Integration (Optional - enables sync features)
# -----------------------------------------------------------------------------
# GITHUB_TOKEN="ghp_..."
# GITHUB_REPO_URL="https://github.com/user/repo"

# -----------------------------------------------------------------------------
# Site Configuration (Optional)
# -----------------------------------------------------------------------------
# AWESOME_RAW_URL="https://raw.githubusercontent.com/avelino/awesome-go/main/README.md"
# WEBSITE_URL="https://awesome-list.com"

# -----------------------------------------------------------------------------
# Frontend Configuration (Optional)
# -----------------------------------------------------------------------------
# VITE_SITE_TITLE="Awesome Go"
# VITE_SITE_DESCRIPTION="A curated list of awesome Go frameworks, libraries and software"
# VITE_SITE_URL="http://localhost:5000"
# VITE_DEFAULT_THEME="auto"

# -----------------------------------------------------------------------------
# Analytics (Optional)
# -----------------------------------------------------------------------------
# VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

---

## See Also

- [Setup Guide](./SETUP.md) - Complete development setup instructions
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [API Reference](./API.md) - API endpoint documentation
