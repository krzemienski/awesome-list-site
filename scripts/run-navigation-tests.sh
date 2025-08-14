#!/bin/bash

echo "🚀 Comprehensive Navigation Testing Suite"
echo "========================================"

# Ensure server is running
echo "🌐 Checking if server is running on port 5000..."
if ! curl -s http://localhost:5000/api/awesome-list > /dev/null; then
    echo "❌ Server not running on port 5000"
    echo "   Please start the server with: npm run dev"
    exit 1
fi

echo "✅ Server is running"

# Create test results directory
mkdir -p ./test-screenshots

# Run comprehensive navigation tests
echo "🧪 Running comprehensive navigation tests..."
node scripts/comprehensive-navigation-test.js

# Check test results
if [ $? -eq 0 ]; then
    echo "🎉 All navigation tests passed!"
else 
    echo "❌ Some navigation tests failed - check results for details"
fi

echo ""
echo "📄 Test results available in: ./test-screenshots/comprehensive-navigation-results.json"
echo "🔍 View detailed results:"
echo "   cat ./test-screenshots/comprehensive-navigation-results.json | jq '.summary'"