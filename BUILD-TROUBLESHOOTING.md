# Build Troubleshooting Guide

## Current Build Issue

The GitHub Actions deployment is failing during the Vite production build step. Analysis shows:

1. **Bundle Size**: Large dependency tree causing memory/timeout issues
2. **Replit Plugins**: Development-specific plugins may not work in CI environment
3. **Static Data**: Large JSON payload (2,011 resources) affecting build performance

## Solutions Implemented

### 1. Optimized GitHub Actions Workflow
- Increased Node.js memory allocation to 6GB
- Added 15-minute timeout for build step
- Direct Vite build command bypassing npm script overhead
- Correct build output path (`dist/public`)

### 2. Environment Configuration
- Explicit NODE_ENV=production to disable development plugins
- VITE_STATIC_BUILD flag to enable static mode
- Reduced logging verbosity during build

### 3. Alternative Build Strategy

If the current build continues to fail, use this alternative approach:

```yaml
# Alternative build step for .github/workflows/deploy.yml
- name: Build for production (alternative)
  run: |
    # Build only the frontend without server bundling
    cd client
    npx vite build --outDir ../dist/public
  env:
    NODE_ENV: 'production'
    VITE_STATIC_BUILD: 'true'
    # ... other env vars
```

## Local Testing Commands

```bash
# Test static data generation
tsx scripts/build-static.ts

# Test frontend-only build
cd client && npx vite build --outDir ../dist/public

# Verify build output
ls -la dist/public/
```

## Build Output Structure

Correct structure after successful build:
```
dist/public/
├── index.html
├── assets/
│   ├── index-[hash].css
│   └── index-[hash].js
└── data/
    ├── awesome-list.json
    └── sitemap.json
```

## Next Steps

1. Monitor current GitHub Actions run with optimized configuration
2. If build still fails, implement frontend-only build approach
3. Verify static data is properly included in build output
4. Test deployed site functionality

The deployment system architecture is correct - the issue is build optimization for the CI environment.