#!/bin/bash

# Create deployment branch with all necessary files
echo "Creating deployment branch for awesome-video site..."

# Remove any existing lock files
rm -f .git/index.lock
rm -f .git/refs/heads/deployment.lock

# Stage all deployment files
git add .github/workflows/deploy-static.yml
git add client/public/data/awesome-list.json
git add client/public/data/sitemap.json
git add client/public/sitemap.xml
git add .env.production
git add scripts/build-sitemap.ts
git add scripts/deploy-with-analytics.ts
git add DEPLOYMENT-READY.md

# Create deployment branch
git checkout -b deployment 2>/dev/null || git checkout deployment

# Commit deployment configuration
git commit -m "Add deployment configuration with Google Analytics integration

- Complete GitHub Actions workflow for static site deployment
- Google Analytics tracking configured (G-383541848)
- Sitemap generation with 58 pages covering 55 categories
- Production environment setup
- 2011 authentic video resources ready for deployment"

echo "Deployment branch created successfully!"
echo "Push with: git push origin deployment"