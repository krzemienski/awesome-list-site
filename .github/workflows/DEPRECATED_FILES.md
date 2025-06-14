# Deprecated GitHub Actions Workflows

The following workflow files are deprecated and should not be used:

- `build-assets.yml` - Old asset building workflow
- `deploy-from-build.yml` - Complex multi-stage deployment
- `deploy-production.yml` - Production deployment with React build issues
- `deploy-simple.yml` - Simple deployment (superseded by deploy-clean.yml)
- `deploy.yml` - Original deployment workflow with complex dependencies

## Current Workflow

Use only: **`deploy-clean.yml`**

This single workflow handles:
- Data fetching from awesome-video repository
- Static site generation
- GitHub Pages deployment

## Cleanup Instructions

These deprecated files can be safely removed after confirming deploy-clean.yml works correctly.