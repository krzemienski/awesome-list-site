# Environment Variables

This document describes all environment variables used by the Awesome List Site application.

## Quick Start

1. Copy `.env.example` to `.env`
2. Configure required variables (at minimum `DATABASE_URL`)
3. Adjust optional variables as needed for your deployment

```bash
cp .env.example .env
```

## Required Variables

### DATABASE_URL

**Type:** `string` (PostgreSQL connection string)
**Required:** Yes
**Default:** None

PostgreSQL database connection string. The application cannot start without this.

**Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

**Examples:**

```bash
# Neon (production cloud database)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/awesome_list_site?sslmode=require

# Local Docker PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/awesome_list_site

# Railway
DATABASE_URL=postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway

# Supabase
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

**Platform Notes:**
- **Neon:** Requires `?sslmode=require` parameter
- **Local Development:** Use Docker Compose (see `DEPLOYMENT.md`)
- **Railway/Render:** Automatically provided in production environment
- **Supabase:** Use the "Connection string" from project settings

---

## Server Configuration

### NODE_ENV

**Type:** `string`
**Required:** No
**Default:** `development`

Application environment mode. Affects logging, error handling, and performance optimizations.

**Valid Values:**
- `development` - Verbose logging, detailed errors, hot reloading
- `production` - Optimized performance, minimal logging, secure error messages

**Example:**
```bash
# Development
NODE_ENV=development

# Production (set automatically on most platforms)
NODE_ENV=production
```

**Platform Notes:**
- Most cloud platforms automatically set this to `production`
- Local development should use `development`

### PORT

**Type:** `number`
**Required:** No
**Default:** `5000`

HTTP server port number.

**Example:**
```bash
PORT=5000
```

**Platform Notes:**
- **Replit Autoscale:** Automatically set (do not override)
- **Vercel:** Automatically set (do not override)
- **Railway/Render:** Automatically set or use default
- **Local Development:** Use `5000` or any available port

---

## Content Configuration

### AWESOME_RAW_URL

**Type:** `string` (URL)
**Required:** No
**Default:** `https://raw.githubusercontent.com/avelino/awesome-go/main/README.md`

URL to the raw markdown content of the awesome list.

**Example:**
```bash
AWESOME_RAW_URL=https://raw.githubusercontent.com/avelino/awesome-go/main/README.md
```

**Use Cases:**
- Point to a different awesome list repository
- Use a forked version of the content
- Test with a custom markdown file

### GITHUB_REPO_URL

**Type:** `string` (URL)
**Required:** No
**Default:** None

GitHub repository URL for the awesome list. Used to generate contribution links.

**Example:**
```bash
GITHUB_REPO_URL=https://github.com/avelino/awesome-go
```

**Features:**
- Generates "Edit on GitHub" links
- Creates contribution guidelines links
- Powers community features

---

## Platform-Specific Configuration

### REPL_ID

**Type:** `string`
**Required:** No (auto-detected on Replit)
**Default:** Auto-detected

Replit deployment identifier. Automatically set when running on Replit.

**Example:**
```bash
REPL_ID=your-repl-id
```

**Platform Notes:**
- **Replit:** Automatically provided by the platform
- **Other Platforms:** Not needed, leave unset

---

## Optional/Future Features

These variables are for planned features and are not currently required.

### SESSION_SECRET

**Type:** `string` (base64)
**Required:** No
**Default:** None
**Status:** Planned feature

Secret key for session encryption and security.

**Generate:**
```bash
openssl rand -base64 32
```

**Example:**
```bash
SESSION_SECRET=Zx8Kp2Qm9Vb3Nc7Hf5Jt1Wr4Yd6Sg0L
```

**Security Notes:**
- Must be random and cryptographically secure
- Never commit to version control
- Rotate regularly in production
- Use different values for dev/staging/prod

### ANTHROPIC_API_KEY

**Type:** `string`
**Required:** No
**Default:** None
**Status:** Planned feature

API key for Anthropic Claude AI integration.

**Example:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**Features:**
- AI-powered search
- Content recommendations
- Natural language queries

### OPENAI_API_KEY

**Type:** `string`
**Required:** No
**Default:** None
**Status:** Planned feature

API key for OpenAI integration.

**Example:**
```bash
OPENAI_API_KEY=sk-xxxxx
```

### GITHUB_TOKEN

**Type:** `string`
**Required:** No
**Default:** None
**Status:** Planned feature

GitHub personal access token for enhanced GitHub API integration.

**Example:**
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

**Scopes Needed:**
- `public_repo` - Access public repositories
- `read:user` - Read user profile

### ISSUER_URL

**Type:** `string` (URL)
**Required:** No
**Default:** None
**Status:** Planned feature (Replit-specific)

OAuth issuer URL for Replit authentication.

**Example:**
```bash
ISSUER_URL=https://replit.com/issuer
```

**Platform Notes:**
- Only needed for Replit OAuth integration
- Not required for basic deployments

---

## Environment File Management

### Development

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/awesome_list_site
NODE_ENV=development
PORT=5000
```

### Production

**Never commit `.env` files to version control.**

Set environment variables through your platform's dashboard:

- **Vercel:** Project Settings → Environment Variables
- **Railway:** Project → Variables tab
- **Render:** Environment → Environment Variables
- **Replit Autoscale:** Secrets tab (lock icon)
- **Neon:** Database connection string in dashboard

### CI/CD

For GitHub Actions or other CI/CD:

1. Store secrets in your CI platform
2. Reference them in workflow files
3. Never hardcode sensitive values

**GitHub Actions Example:**
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  NODE_ENV: production
```

---

## Validation

The application validates environment variables at startup. If required variables are missing or invalid, you'll see clear error messages:

```
❌ DATABASE_URL is required but not set
❌ DATABASE_URL must be a valid PostgreSQL connection string
```

---

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Use different values per environment** - Dev, staging, and production should have separate credentials
3. **Rotate secrets regularly** - Especially in production
4. **Use strong, random values** - For tokens and secrets
5. **Limit access** - Only grant necessary permissions
6. **Monitor usage** - Watch for unauthorized access
7. **Use platform secret managers** - Leverage built-in security features

---

## Troubleshooting

### "DATABASE_URL is required"

**Cause:** Missing or empty `DATABASE_URL`
**Solution:** Set `DATABASE_URL` in `.env` or platform environment variables

### "Cannot connect to database"

**Cause:** Invalid connection string or database not accessible
**Solutions:**
- Verify connection string format
- Check database is running (local) or accessible (cloud)
- Verify network/firewall rules
- Check SSL requirements (`?sslmode=require` for Neon)

### "Port already in use"

**Cause:** Another process is using the specified port
**Solutions:**
- Change `PORT` to a different value
- Stop the conflicting process
- On cloud platforms, don't override `PORT`

### "Missing environment variables in production"

**Cause:** Variables set locally but not on platform
**Solutions:**
- Set variables in platform dashboard
- Verify variable names match exactly
- Check for typos in variable names
- Restart application after setting variables

---

## Platform-Specific Guides

### Vercel

Set variables in: Project Settings → Environment Variables

Required:
- `DATABASE_URL` - Your PostgreSQL connection string

Automatic:
- `NODE_ENV=production`
- `PORT` (automatically assigned)

### Railway

Set variables in: Project → Variables tab

Required:
- `DATABASE_URL` - Use Railway PostgreSQL or external DB

Automatic:
- `PORT` (automatically assigned)

### Render

Set variables in: Environment → Environment Variables

Required:
- `DATABASE_URL` - Use Render PostgreSQL or external DB

Automatic:
- `NODE_ENV=production`
- `PORT` (automatically assigned)

### Replit Autoscale

Set variables in: Secrets tab (lock icon)

Required:
- `DATABASE_URL` - Use Neon or external PostgreSQL

Automatic:
- `REPL_ID` (automatically set)
- `PORT` (automatically assigned)

### Local Development

Create `.env` file:

Required:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/awesome_list_site`

Optional:
- `NODE_ENV=development`
- `PORT=5000`

---

## Reference

- See `.env.example` for a complete template
- See `DEPLOYMENT.md` for platform-specific deployment guides
- See `README.md` for general setup instructions
