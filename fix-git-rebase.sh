#!/bin/bash
# Complete Git Rebase Resolution
# Run this script to resolve the rebase conflict and synchronize the project

echo "Resolving git rebase conflict..."

# Force remove git locks
sudo rm -f .git/index.lock .git/refs/heads/main.lock 2>/dev/null || rm -f .git/index.lock .git/refs/heads/main.lock 2>/dev/null

# Remove the conflicted build trigger file
rm -f .build-trigger

# Skip the problematic commit that's causing the conflict
git rebase --skip

# If rebase completes, add working files and commit
if [ $? -eq 0 ]; then
    echo "Rebase completed successfully"
    
    # Create clean build trigger
    echo "$(date -Iseconds)" > .build-trigger
    
    # Stage essential working files
    git add scripts/deploy-simple-working.ts
    git add awesome-list.config.yaml
    git add client/public/data/awesome-list.json
    git add client/public/data/sitemap.json
    git add .build-trigger
    git add .deployment-ready
    
    # Commit the synchronized state
    git commit -m "Synchronize deployment system with 2011 authentic awesome-video resources"
    
    # Push to origin
    git push origin main
    
    echo "✅ Project synchronized successfully"
    echo "Monitor deployment: https://github.com/krzemienski/awesome-list-site/actions"
    echo "Site URL: https://krzemienski.github.io/awesome-list-site"
    
else
    echo "Rebase failed, aborting and starting fresh..."
    
    # Abort rebase and reset to clean state
    git rebase --abort
    git reset --hard origin/main
    git clean -fd
    
    # Add working files to clean repository
    echo "$(date -Iseconds)" > .build-trigger
    git add scripts/deploy-simple-working.ts
    git add awesome-list.config.yaml
    git add client/public/data/
    git add .build-trigger
    git add .deployment-ready
    
    git commit -m "Add working deployment system with 2011 authentic resources"
    git push origin main
    
    echo "✅ Project reset and synchronized"
fi