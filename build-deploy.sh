#!/bin/bash

# Build and Deploy Script for Awesome Video Dashboard
# Usage: ./build-deploy.sh

set -e

echo "🚀 Starting build and deploy process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Check if tsx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

# Run the TypeScript build script
echo "📦 Running build and deploy script..."
npx tsx scripts/build-and-deploy.ts

echo "✅ Build and deploy process completed!"
echo "📍 Check GitHub Actions for deployment status"
echo "🌐 Site will be available at: https://krzemienski.github.io/awesome-list-site"