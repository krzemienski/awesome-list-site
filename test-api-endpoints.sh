#!/bin/bash

# Comprehensive API endpoint testing script
# Tests error handling, status codes, and response formats

set -e

BASE_URL="http://localhost:5000"
FAILED_TESTS=0
PASSED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "API Endpoint Testing"
echo "=========================================="
echo ""

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_status="$4"
    local auth_header="$5"

    echo -n "Testing: $name ... "

    if [ -n "$auth_header" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$url" -H "$auth_header" -H "Content-Type: application/json" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$url" -H "Content-Type: application/json" 2>/dev/null || echo "000")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        # Check if response is valid JSON
        if echo "$body" | jq . >/dev/null 2>&1; then
            # Check for consistent error format (if it's an error response)
            if [ "$status_code" -ge 400 ]; then
                has_message=$(echo "$body" | jq 'has("message")' 2>/dev/null)
                if [ "$has_message" = "true" ]; then
                    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
                    PASSED_TESTS=$((PASSED_TESTS + 1))
                else
                    echo -e "${RED}✗ FAIL${NC} (Missing 'message' field in error response)"
                    echo "  Response: $body"
                    FAILED_TESTS=$((FAILED_TESTS + 1))
                fi
            else
                echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            fi
        else
            echo -e "${RED}✗ FAIL${NC} (Invalid JSON response)"
            echo "  Response: $body"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        echo "  Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "1. Testing Error Handling Test Routes"
echo "--------------------------------------"
test_endpoint "ValidationError (400)" "GET" "/api/test/error/validation" "400"
test_endpoint "UnauthorizedError (401)" "GET" "/api/test/error/unauthorized" "401"
test_endpoint "ForbiddenError (403)" "GET" "/api/test/error/forbidden" "403"
test_endpoint "NotFoundError (404)" "GET" "/api/test/error/notfound" "404"
test_endpoint "InternalServerError (500)" "GET" "/api/test/error/server" "500"
test_endpoint "Generic Error (500)" "GET" "/api/test/error/generic" "500"
test_endpoint "Async Error (500)" "GET" "/api/test/error/async" "500"
test_endpoint "Success Route (200)" "GET" "/api/test/error/success" "200"
echo ""

echo "2. Testing Category Endpoints"
echo "------------------------------"
test_endpoint "Get Categories" "GET" "/api/categories" "200"
test_endpoint "Get Subcategories" "GET" "/api/subcategories" "200"
test_endpoint "Get Sub-subcategories" "GET" "/api/sub-subcategories" "200"
echo ""

echo "3. Testing Resource Endpoints"
echo "------------------------------"
test_endpoint "Get Resources" "GET" "/api/resources" "200"
test_endpoint "Non-existent Resource (404)" "GET" "/api/resources/99999" "404"
echo ""

echo "4. Testing Authentication Endpoints"
echo "------------------------------------"
test_endpoint "Get User (Unauthenticated)" "GET" "/api/auth/user" "401"
echo ""

echo "5. Testing Protected Admin Endpoints"
echo "-------------------------------------"
test_endpoint "Admin Stats (Unauthorized)" "GET" "/api/admin/stats" "401"
test_endpoint "Pending Resources (Unauthorized)" "GET" "/api/resources/pending" "401"
echo ""

echo "6. Testing SEO/Public Endpoints"
echo "--------------------------------"
test_endpoint "Sitemap XML" "GET" "/sitemap.xml" "200"
test_endpoint "OG Image SVG" "GET" "/og-image.svg" "200"
echo ""

echo "7. Testing GitHub Endpoints"
echo "----------------------------"
test_endpoint "Discover Awesome Lists" "GET" "/api/github/awesome-lists" "200"
echo ""

echo "8. Testing User Feature Endpoints (Unauthenticated)"
echo "----------------------------------------------------"
test_endpoint "Get Favorites (Unauthorized)" "GET" "/api/favorites" "401"
test_endpoint "Get Bookmarks (Unauthorized)" "GET" "/api/bookmarks" "401"
test_endpoint "User Progress (Unauthorized)" "GET" "/api/user/progress" "401"
test_endpoint "User Submissions (Unauthorized)" "GET" "/api/user/submissions" "401"
echo ""

echo "9. Testing Non-existent Endpoint (404)"
echo "---------------------------------------"
test_endpoint "Non-existent Route" "GET" "/api/nonexistent/route" "404"
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo "Total:  $((PASSED_TESTS + FAILED_TESTS))"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
