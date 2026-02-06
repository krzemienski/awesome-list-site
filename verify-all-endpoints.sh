#!/bin/bash

# Endpoint Verification Script
# Tests all API endpoints to ensure caching doesn't break functionality

set -e

echo "================================="
echo "API Endpoint Verification Script"
echo "================================="
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
TIMEOUT=10

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local check_pattern="${4:-}"

  echo -n "Testing $name... "

  # Make the request
  response=$(curl -s -w "\n%{http_code}" -m $TIMEOUT "$url" 2>/dev/null || echo "000")

  # Extract status code (last line)
  status_code=$(echo "$response" | tail -n1)

  # Extract body (everything except last line)
  body=$(echo "$response" | head -n-1)

  # Check status code
  if [ "$status_code" != "$expected_status" ]; then
    echo -e "${RED}FAILED${NC} (Expected $expected_status, got $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi

  # Check pattern if provided
  if [ -n "$check_pattern" ]; then
    if echo "$body" | grep -q "$check_pattern"; then
      echo -e "${GREEN}PASSED${NC} (Status: $status_code, Pattern found)"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
    else
      echo -e "${RED}FAILED${NC} (Status OK but pattern not found)"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
  fi

  echo -e "${GREEN}PASSED${NC} (Status: $status_code)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  return 0
}

# Check if server is running
echo "Checking if server is running at $BASE_URL..."
if ! curl -s -m 5 "$BASE_URL" > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Server is not running at $BASE_URL${NC}"
  echo "Please start the server with: npm run dev"
  exit 1
fi
echo -e "${GREEN}Server is running${NC}"
echo ""

# Test 1: Basic awesome-list API
echo "=== Test 1: Basic API Endpoint ==="
test_endpoint \
  "GET /api/awesome-list" \
  "$BASE_URL/api/awesome-list" \
  "200" \
  '"categories"'
echo ""

# Test 2: Sitemap generation
echo "=== Test 2: Sitemap Generation ==="
test_endpoint \
  "GET /sitemap.xml" \
  "$BASE_URL/sitemap.xml" \
  "200" \
  '<urlset'
echo ""

# Test 3: OpenGraph image generation
echo "=== Test 3: OpenGraph Image ==="
test_endpoint \
  "GET /og-image" \
  "$BASE_URL/og-image" \
  "200" \
  '<svg'
echo ""

# Test 4: Filtered query - category
echo "=== Test 4: Filtered Queries ==="
echo "Testing category filter..."
# First, get a category from the API
category=$(curl -s "$BASE_URL/api/awesome-list" | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$category" ]; then
  test_endpoint \
    "GET /api/awesome-list?category=$category" \
    "$BASE_URL/api/awesome-list?category=$category" \
    "200" \
    '"resources"'
else
  echo -e "${YELLOW}SKIPPED${NC} (No categories found in database)"
fi
echo ""

# Test 5: Multiple requests to verify caching
echo "=== Test 5: Cache Consistency ==="
echo "Making multiple requests to verify consistent responses..."

response1=$(curl -s "$BASE_URL/api/awesome-list")
sleep 1
response2=$(curl -s "$BASE_URL/api/awesome-list")

# Compare responses (they should be identical)
if [ "$response1" = "$response2" ]; then
  echo -e "${GREEN}PASSED${NC} (Responses are consistent)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}FAILED${NC} (Responses differ between calls)"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 6: Verify response structure
echo "=== Test 6: Response Structure ==="
response=$(curl -s "$BASE_URL/api/awesome-list")

# Check for required fields
for field in "title" "categories" "resources"; do
  echo -n "Checking for '$field' field... "
  if echo "$response" | grep -q "\"$field\""; then
    echo -e "${GREEN}PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done
echo ""

# Summary
echo "================================="
echo "Test Summary"
echo "================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
