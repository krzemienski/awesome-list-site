#!/bin/bash
# Wave 1 Progress Check Script
# Run periodically to monitor parallel agent progress

echo "=========================================="
echo "WAVE 1 PROGRESS CHECK - $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=========================================="

# Test file counts
echo ""
echo "=== TEST FILES ==="
echo "API Tests:         $(find /Users/nick/Desktop/awesome-list-site/tests/api -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')"
echo "User Workflow:     $(find /Users/nick/Desktop/awesome-list-site/tests/user-workflows -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')"
echo "Admin Workflow:    $(find /Users/nick/Desktop/awesome-list-site/tests/admin-workflows -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')"
echo "Security:          $(find /Users/nick/Desktop/awesome-list-site/tests/security -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')"

# Line counts
echo ""
echo "=== LINE COUNTS ==="
echo "API:           $(wc -l /Users/nick/Desktop/awesome-list-site/tests/api/*.spec.ts 2>/dev/null | tail -1 | awk '{print $1}')"
echo "User:          $(wc -l /Users/nick/Desktop/awesome-list-site/tests/user-workflows/*.spec.ts 2>/dev/null | tail -1 | awk '{print $1}' || echo '0')"
echo "Admin:         $(wc -l /Users/nick/Desktop/awesome-list-site/tests/admin-workflows/*.spec.ts 2>/dev/null | tail -1 | awk '{print $1}' || echo '0')"
echo "Security:      $(wc -l /Users/nick/Desktop/awesome-list-site/tests/security/*.spec.ts 2>/dev/null | tail -1 | awk '{print $1}' || echo '0')"

# Bug queue
echo ""
echo "=== BUG QUEUE ==="
echo "Bug reports:   $(find /Users/nick/Desktop/awesome-list-site/docs/bugs -name 'BUG_*.md' 2>/dev/null | wc -l | tr -d ' ')"

# New files in last hour
echo ""
echo "=== NEW FILES (last hour) ==="
find /Users/nick/Desktop/awesome-list-site/tests -name '*.spec.ts' -mmin -60 2>/dev/null

# Docker status
echo ""
echo "=== DOCKER STATUS ==="
docker-compose ps 2>/dev/null | head -10

# API health
echo ""
echo "=== API HEALTH ==="
curl -s http://localhost:3000/api/health 2>/dev/null || echo "API not responding"

echo ""
echo "=========================================="
