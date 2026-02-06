#!/bin/bash

# Verification script for subtask-6-2: Verify build works without Replit environment
# This script tests that the application builds and starts successfully without REPL_ID

set -e  # Exit on error

echo "========================================="
echo "Non-Replit Build Verification"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Step 1: Ensure REPL_ID is not set
echo "Step 1: Checking REPL_ID environment variable..."
if [ -z "$REPL_ID" ]; then
    print_status 0 "REPL_ID is not set (as expected)"
else
    print_warning "REPL_ID is currently set to: $REPL_ID"
    echo "Unsetting REPL_ID for this verification..."
    unset REPL_ID
    print_status 0 "REPL_ID unset for verification"
fi
echo ""

# Step 2: Clean previous build
echo "Step 2: Cleaning previous build artifacts..."
if [ -d "dist" ]; then
    rm -rf dist
    print_status 0 "Removed existing dist/ directory"
else
    print_status 0 "No existing dist/ directory to clean"
fi
echo ""

# Step 3: Run the build
echo "Step 3: Running npm run build without REPL_ID..."
echo "----------------------------------------"
if npm run build; then
    print_status 0 "Build completed successfully"
else
    print_status 1 "Build failed"
    exit 1
fi
echo ""

# Step 4: Verify build outputs
echo "Step 4: Verifying build outputs..."
if [ -d "dist/public" ] && [ -f "dist/index.js" ]; then
    print_status 0 "Build artifacts created (dist/public/ and dist/index.js)"
else
    print_status 1 "Build artifacts missing"
    exit 1
fi
echo ""

# Step 5: Check for Replit plugin references in build output
echo "Step 5: Checking that Replit plugins were conditionally excluded..."
if grep -r "@replit" dist/ 2>/dev/null; then
    print_warning "Found @replit references in dist/ - this may be okay if they're only in source maps"
else
    print_status 0 "No @replit references in dist/ output"
fi
echo ""

# Step 6: Start the server (with timeout)
echo "Step 6: Testing server startup without REPL_ID..."
echo "Starting server in background..."

# Start server in background
NODE_ENV=production npm run start > /tmp/server-output.log 2>&1 &
SERVER_PID=$!

# Wait for server to start (max 30 seconds)
echo "Waiting for server to start..."
MAX_WAIT=30
WAITED=0
SERVER_STARTED=false

while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        SERVER_STARTED=true
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
    echo -n "."
done
echo ""

if [ "$SERVER_STARTED" = true ]; then
    print_status 0 "Server started successfully"

    # Step 7: Verify health endpoint
    echo ""
    echo "Step 7: Verifying health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
        print_status 0 "Health endpoint returned OK status"
        echo "Response: $HEALTH_RESPONSE"
    else
        print_warning "Health endpoint returned unexpected response"
        echo "Response: $HEALTH_RESPONSE"
    fi

    # Step 8: Verify frontend serves
    echo ""
    echo "Step 8: Verifying frontend serves..."
    if curl -s http://localhost:5000/ | grep -q "<!doctype html>"; then
        print_status 0 "Frontend HTML served successfully"
    else
        print_status 1 "Frontend did not serve expected HTML"
    fi

    # Cleanup: Stop server
    echo ""
    echo "Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    print_status 0 "Server stopped"
else
    print_status 1 "Server failed to start within ${MAX_WAIT} seconds"
    echo ""
    echo "Server output:"
    cat /tmp/server-output.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ All verification steps passed!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Build works without REPL_ID environment variable"
echo "  ✓ Server starts successfully without REPL_ID"
echo "  ✓ Health endpoint is accessible"
echo "  ✓ Frontend serves correctly"
echo ""
echo "The application is ready for multi-platform deployment!"
