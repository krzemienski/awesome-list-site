# Developer Build and Deploy Guide

This guide explains how to build and deploy the Awesome Video Dashboard locally using the provided scripts.

## Quick Start

To build and deploy the application locally:

```bash
npx tsx scripts/build-and-deploy.ts
```

## What the Script Does

The build and deploy script automates the following process:

1. **Prerequisites Check**
   - Verifies you're in a git repository
   - Ensures no uncommitted changes exist

2. **Data Preparation** 
   - Fetches latest awesome-video data from the GitHub repository
   - Processes and prepares static data files

3. **React Application Build**
   - Attempts to build the React application using Vite
   - If local build fails (expected due to dependency complexity), creates a trigger for GitHub Actions

4. **Deployment Branch Creation**
   - Creates or switches to `gh-pages-build` branch
   - Moves built assets to the branch root
   - Commits all changes with timestamp

5. **Push to GitHub**
   - Pushes the deployment branch to GitHub
   - Triggers automatic GitHub Pages deployment

## Branch Structure

The deployment uses a two-branch approach:

- **main**: Source code and development
- **gh-pages-build**: Built assets ready for deployment

## GitHub Actions Integration

The script integrates with two GitHub Actions workflows:

1. **Build React Assets** (`build-assets.yml`)
   - Runs when changes are pushed to main branch
   - Handles complex Vite build process with extended timeout
   - Commits built assets to `gh-pages-build` branch

2. **Deploy to GitHub Pages** (`deploy-from-build.yml`) 
   - Automatically triggered when build workflow completes
   - Deploys from the `gh-pages-build` branch to GitHub Pages

## Local vs GitHub Actions Build

### Local Build
- Fast data preparation and branch management
- May fail on Vite build due to dependency complexity
- Creates trigger for GitHub Actions when local build fails

### GitHub Actions Build  
- Extended timeout (2 hours) for complete Vite compilation
- Optimized memory settings and build configuration
- Guaranteed to complete the React application build

## Prerequisites

Before running the build script:

1. **Git Repository**: Must be run from the project root
2. **Clean Working Directory**: No uncommitted changes
3. **Node.js**: Version 20 or higher
4. **Dependencies**: Run `npm install` first

## Environment Variables

The script uses these environment variables for the build:

```bash
NODE_ENV=production
VITE_STATIC_BUILD=true
VITE_GA_MEASUREMENT_ID=G-383541848
VITE_SITE_TITLE="Awesome Video Dashboard"
VITE_SITE_DESCRIPTION="A curated collection of awesome video resources and tools"
VITE_SITE_URL="https://krzemienski.github.io/awesome-list-site"
VITE_DEFAULT_THEME="red"
```

## Troubleshooting

### Build Fails Locally
This is expected behavior. The script will:
- Create a build trigger file
- Push to main branch to initiate GitHub Actions
- GitHub Actions will handle the complex build process

### Git Authentication
Ensure you have:
- Git configured with your credentials
- Push access to the repository
- SSH keys or personal access token set up

### Branch Conflicts
If you encounter branch conflicts:
```bash
git checkout main
git branch -D gh-pages-build  # Delete local deployment branch
npx tsx scripts/build-and-deploy.ts  # Re-run script
```

## Deployment Timeline

1. **Local Script**: 2-5 minutes (data prep + branch management)
2. **GitHub Actions Build**: 30-90 minutes (complete React build)
3. **GitHub Actions Deploy**: 2-5 minutes (GitHub Pages deployment)
4. **Total**: 35-100 minutes for complete deployment

## Verification

After running the script:

1. Check the `gh-pages-build` branch exists on GitHub
2. Monitor GitHub Actions workflows in the repository
3. Verify deployment at: https://krzemienski.github.io/awesome-list-site

## Manual Deployment

For manual deployment without the script:

```bash
# Fetch data
npx tsx scripts/build-static.ts

# Build (may timeout locally)
npm run build

# Create deployment branch manually
git checkout -B gh-pages-build
# ... manual file management
git push -f origin gh-pages-build
```

## Script Configuration

The script can be configured by modifying `scripts/build-and-deploy.ts`:

```typescript
const config: BuildConfig = {
  branchName: 'gh-pages-build',  // Deployment branch name
  buildDir: 'dist',              // Build output directory
  publicDir: 'dist/public',      // Public assets directory
};
```