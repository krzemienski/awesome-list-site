#!/bin/bash

echo "🖼️ Visual Navigation Testing with Screenshot Analysis"
echo "======================================================"

# Ensure server is running
echo "🌐 Checking if server is running on port 5000..."
if ! curl -s http://localhost:5000/api/awesome-list > /dev/null; then
    echo "❌ Server not running on port 5000"
    echo "   Please start the server with: npm run dev"
    exit 1
fi

echo "✅ Server is running"

# Create test directories
mkdir -p ./test-screenshots/navigation-screenshots

# Run visual navigation tests with screenshots
echo "🧪 Running visual navigation tests with screenshot analysis..."
echo "📸 This will capture desktop and mobile screenshots for all 28 navigation items"
echo "⏱️ Estimated time: 3-5 minutes for complete visual testing"

node scripts/visual-navigation-testing.js

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Visual navigation testing completed successfully!"
    echo "📸 Screenshots saved to: ./test-screenshots/navigation-screenshots/"
    echo "📊 Visual report: ./test-screenshots/visual-navigation-report.html"
    echo "📄 Detailed JSON: ./test-screenshots/visual-navigation-results.json"
    echo ""
    echo "🌐 Open the HTML report in your browser to see all screenshots and analysis!"
else 
    echo ""
    echo "❌ Visual testing encountered issues - check results for details"
    echo "📄 Error details in: ./test-screenshots/visual-navigation-results.json"
fi

# Display summary
echo ""
echo "📋 Test Summary:"
if [ -f "./test-screenshots/visual-navigation-results.json" ]; then
    node -e "
    const results = require('./test-screenshots/visual-navigation-results.json');
    console.log(\`✅ Screenshots captured: \${results.screenshots ? results.screenshots.length * 2 : 0} (desktop + mobile)\`);
    console.log(\`📊 Tests passed: \${results.passed}/\${results.totalItems}\`);
    console.log(\`❌ Tests failed: \${results.failed}/\${results.totalItems}\`);
    "
else
    echo "❌ Results file not found - test may have failed"
fi