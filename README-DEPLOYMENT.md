# Deployment Guide

## Quick Deploy

Run the local build script to deploy:

```bash
# Using the shell script
./build-deploy.sh

# Or directly with npx
npx tsx scripts/build-and-deploy.ts
```

## How It Works

1. **Local Script** - Prepares data and creates deployment branch
2. **GitHub Actions** - Builds React application with extended timeout 
3. **Auto Deploy** - Deploys to GitHub Pages when build completes

## Deployment Architecture

```
main branch (source code)
    ↓ (local script creates)
gh-pages-build branch (built assets)
    ↓ (GitHub Actions triggers)
GitHub Pages (live site)
```

## Workflows

- **Build React Assets**: Handles Vite compilation with 2-hour timeout
- **Deploy to GitHub Pages**: Automatically deploys from build branch

## Site URL

https://krzemienski.github.io/awesome-list-site

## Development Workflow

1. Make changes on `main` branch
2. Run `./build-deploy.sh` 
3. GitHub Actions builds and deploys automatically
4. Site updates within 30-90 minutes

The system handles build timeouts by separating local preparation from containerized compilation, ensuring the React application builds completely without interruption.