#!/bin/bash
set -e

echo "Building application..."
npm run build

echo "Copying migrations to dist..."
cp -r migrations dist/

echo "Build complete!"
ls -la dist/
ls -la dist/migrations/
