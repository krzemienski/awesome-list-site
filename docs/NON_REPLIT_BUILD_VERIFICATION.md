# Non-Replit Build Verification

This document describes the verification process for **subtask-6-2: Verify build works without Replit environment**.

## Overview

The goal is to ensure that the application builds and runs successfully without the `REPL_ID` environment variable, proving that the Replit-specific dependencies have been properly abstracted and made optional.

## Prerequisites

- Node.js 20 or later
- npm installed
- PostgreSQL database (for full server startup test)
- `DATABASE_URL` environment variable set

## Automated Verification

We've created an automated verification script that tests all aspects of non-Replit deployment:

```bash
./scripts/verify-non-replit-build.sh
```

This script performs the following checks:

1. ✓ Ensures `REPL_ID` is not set
2. ✓ Cleans previous build artifacts
3. ✓ Runs `npm run build` without `REPL_ID`
4. ✓ Verifies build outputs exist (`dist/public/`, `dist/index.js`)
5. ✓ Checks that Replit plugins were conditionally excluded
6. ✓ Starts the server without `REPL_ID`
7. ✓ Verifies health endpoint responds correctly
8. ✓ Verifies frontend HTML serves correctly
9. ✓ Cleans up (stops server)

## Manual Verification Steps

If you prefer to verify manually, follow these steps:

### 1. Clean Environment

```bash
# Ensure REPL_ID is not set
unset REPL_ID

# Clean previous build
rm -rf dist/
```

### 2. Build the Application

```bash
npm run build
```

**Expected Result:**
- Build completes without errors
- No errors about missing `@replit/vite-plugin-*` packages
- Output shows both frontend and backend builds:
  ```
  vite v5.x.x building for production...
  ✓ built in Xs

  Build completed successfully
  ```

### 3. Verify Build Artifacts

```bash
ls -la dist/
```

**Expected Result:**
- `dist/public/` directory exists (frontend build)
- `dist/index.js` file exists (backend build)
- `dist/public/index.html` exists
- `dist/public/assets/` directory exists

### 4. Start the Server

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://..."

# Start in production mode
NODE_ENV=production npm run start
```

**Expected Result:**
- Server starts without errors
- No errors about missing Replit authentication
- Logs show server listening on port 5000 (or configured PORT)
- No "REPL_ID not found" errors

### 5. Test Health Endpoint

In another terminal:

```bash
curl http://localhost:5000/health
```

**Expected Result:**
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2026-02-01T..."
}
```

### 6. Test Frontend

```bash
curl http://localhost:5000/
```

**Expected Result:**
- Returns HTML content
- Contains `<!doctype html>`
- No 404 or 500 errors

Open in browser: http://localhost:5000/

**Expected Result:**
- Application loads
- No console errors related to Replit
- Can navigate the site
- Local auth login link is available (not Replit OAuth)

## Code Verification

### 1. Vite Configuration

Check `vite.config.ts`:

```typescript
plugins: [
  react(),
  ...(process.env.REPL_ID !== undefined
    ? [
        await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
          m.default(),
        ),
      ]
    : []),
  ...(process.env.NODE_ENV !== "production" &&
  process.env.REPL_ID !== undefined
    ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
      ]
    : []),
],
```

✓ **Verified:** Replit plugins are conditionally loaded only when `REPL_ID` is defined

### 2. Authentication Setup

Check `server/routes.ts`:

```typescript
// Only setup Replit OAuth if REPL_ID is available (running on Replit)
if (process.env.REPL_ID) {
  await setupAuth(app);
} else {
  // For local development, just setup session without Replit OAuth
  const { getSession } = await import("./replitAuth");
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
}

// Always setup local auth (username/password)
setupLocalAuth(app);
```

✓ **Verified:** Authentication gracefully handles missing `REPL_ID` and falls back to local auth

### 3. Package Dependencies

Check `package.json`:

```json
"devDependencies": {
  "@replit/vite-plugin-cartographer": "^0.4.3",
  "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
  ...
}
```

**Note:** The Replit plugins are in `devDependencies` (not `optionalDependencies` as originally planned). However, they are:
1. Dynamically imported with `await import()` in vite.config.ts
2. Only loaded when `REPL_ID` is defined
3. The build process handles their absence gracefully

## Common Issues and Troubleshooting

### Build Fails with "Cannot find module '@replit/...'"

**Cause:** Replit plugins are not installed

**Solution:** This should not happen with the current implementation, as the plugins use dynamic imports. If you see this error:
1. Verify `vite.config.ts` uses conditional dynamic imports
2. Ensure `REPL_ID` is not set during build
3. Check that the vite config properly uses the conditional operator

### Server Fails to Start

**Cause:** Missing `DATABASE_URL` environment variable

**Solution:**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### Health Endpoint Returns 503

**Cause:** Database connection failed

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Ensure database is running
3. Check database connectivity: `psql $DATABASE_URL -c "SELECT 1"`

### Frontend Shows 404

**Cause:** Build artifacts missing or server not serving static files

**Solution:**
1. Verify `dist/public/` directory exists
2. Check build logs for errors
3. Ensure `npm run build` completed successfully

## Success Criteria

All of the following must be true:

- [x] `npm run build` succeeds without `REPL_ID`
- [x] No errors about missing `@replit/*` packages
- [x] Build creates `dist/public/` and `dist/index.js`
- [x] Server starts successfully without `REPL_ID`
- [x] Health endpoint returns status 200 with `"status": "ok"`
- [x] Frontend serves correctly at http://localhost:5000/
- [x] No console errors related to Replit in browser
- [x] Local authentication is available (not Replit OAuth)

## Next Steps

After verification passes:

1. Commit the verification script and documentation
2. Update `implementation_plan.json` to mark subtask-6-2 as completed
3. Proceed to subtask-6-3 (Document platform-specific considerations)

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Multi-platform deployment guide
- [DOCKER.md](./DOCKER.md) - Docker deployment guide
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables reference
- [DOCKER_VERIFICATION.md](./DOCKER_VERIFICATION.md) - Docker verification guide
