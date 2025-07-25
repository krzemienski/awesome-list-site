# Deployment Troubleshooting Guide

Based on the GitHub Actions run at: https://github.com/krzemienski/awesome-list-site/actions/runs/15623593109/job/44013555629

## Issues Identified

### 1. Repository Mismatch
The deployment is running in `awesome-list-site` repository instead of `awesome-video`. This suggests the code was pushed to the wrong repository.

### 2. Build Environment Issues
The GitHub Actions workflow is encountering build-related errors during the production build step.

## Solutions

### Fix Repository Location
1. Ensure you're working in the correct repository: `krzemienski/awesome-video`
2. If the code is in `awesome-list-site`, either:
   - Move the deployment files to `awesome-video` repository, or
   - Update configuration to use `awesome-list-site` as the target

### Fix Build Issues
The build is failing during the Vite build step. Common causes:

1. **Missing Environment Variables**: Ensure all required variables are set in repository settings
2. **Build Timeout**: The build may be taking too long due to large bundle size
3. **Memory Issues**: Node.js may be running out of memory during build

## Immediate Actions Required

### 1. Verify Repository Settings
In the correct repository (`krzemienski/awesome-video` or current `awesome-list-site`):

**Repository Variables** (Settings > Secrets and variables > Actions > Variables):
```
SITE_TITLE=Awesome Video Dashboard
SITE_DESCRIPTION=A curated collection of awesome video resources, tools, and technologies for developers and content creators
SITE_URL=https://krzemienski.github.io/awesome-video
DEFAULT_THEME=red
```

**Repository Secrets** (Settings > Secrets and variables > Actions > Secrets):
```
GA_MEASUREMENT_ID=G-383541848
```

### 2. Enable GitHub Pages
1. Go to repository Settings > Pages
2. Set Source to "GitHub Actions"
3. Save configuration

### 3. Fix Build Configuration
If build continues to fail, try updating the workflow to increase build resources:

```yaml
- name: Build for production
  run: npm run build
  env:
    NODE_OPTIONS: '--max-old-space-size=4096'
    VITE_STATIC_BUILD: 'true'
    VITE_GA_MEASUREMENT_ID: ${{ secrets.GA_MEASUREMENT_ID }}
    # ... other env vars
```

### 4. Alternative: Use Current Repository
If you want to deploy from `awesome-list-site` instead, update the configuration:

**In `awesome-list.config.yaml`:**
```yaml
site:
  url: "https://krzemienski.github.io/awesome-list-site"

deploy:
  github:
    repository: "krzemienski/awesome-list-site"
```

**In `.github/workflows/deploy.yml`:**
```yaml
VITE_SITE_URL: ${{ vars.SITE_URL || 'https://krzemienski.github.io/awesome-list-site' }}
```

## Quick Test
To test the build locally before pushing:

```bash
# Generate static data
tsx scripts/build-static.ts

# Test production build
VITE_STATIC_BUILD=true npm run build

# Verify build output
ls -la dist/
```

## Next Steps
1. Choose the target repository (awesome-video vs awesome-list-site)
2. Configure repository settings in the correct repository
3. Update configuration files if using different repository
4. Re-run the deployment workflow
5. Monitor the Actions tab for successful completion

The deployment system is correctly configured - the main issue appears to be repository location and environment variable setup.