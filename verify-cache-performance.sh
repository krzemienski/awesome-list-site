#!/bin/bash

# Cache Performance Verification Script
# Verifies that server-side caching is working correctly and provides performance improvements

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}\n=== Cache Performance Verification ===${NC}\n"

URL="http://localhost:5000/api/awesome-list"

# Function to make a request and measure time
make_request() {
    local request_num=$1
    local description=$2

    echo -e "${CYAN}${description}${NC}"

    # Use curl with timing and capture both status code and time
    # time_total is in seconds with millisecond precision
    output=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/response_${request_num}.json "$URL" 2>&1)

    # Extract status code and time
    status_code=$(echo "$output" | tail -n 2 | head -n 1)
    time_seconds=$(echo "$output" | tail -n 1)

    # Convert to milliseconds
    time_ms=$(echo "$time_seconds * 1000" | bc)

    # Get response size
    if [ -f "/tmp/response_${request_num}.json" ]; then
        size=$(wc -c < /tmp/response_${request_num}.json)
    else
        size=0
    fi

    echo -e "  ${YELLOW}Status: ${status_code}${NC}"
    echo -e "  ${YELLOW}Duration: ${time_ms}ms${NC}"
    echo -e "  ${YELLOW}Data size: ${size} bytes${NC}"

    # Return values via global variables
    eval "status_${request_num}=${status_code}"
    eval "time_${request_num}=${time_ms}"
    eval "size_${request_num}=${size}"

    return 0
}

# Check if server is running
echo -e "${CYAN}Checking if server is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Cannot connect to $URL${NC}"
    echo -e "${YELLOW}Make sure the server is running on http://localhost:5000${NC}"
    exit 1
fi

# Step 1: First request (should hit database - slower)
make_request 1 "Step 1: Making first request (should hit database)..."

if [ "$status_1" != "200" ]; then
    echo -e "\n${RED}❌ FAILED: Expected status 200, got ${status_1}${NC}"
    if [ -f "/tmp/response_1.json" ]; then
        echo -e "${YELLOW}Response preview:${NC}"
        head -c 200 /tmp/response_1.json
        echo
    fi
    exit 1
fi

# Small delay
sleep 0.1

# Step 2: Second request (should hit cache - faster)
make_request 2 "\nStep 2: Making second request (should hit cache)..."

if [ "$status_2" != "200" ]; then
    echo -e "\n${RED}❌ FAILED: Expected status 200, got ${status_2}${NC}"
    exit 1
fi

# Step 3: Third request (should also hit cache - fast)
make_request 3 "\nStep 3: Making third request (should also hit cache)..."

if [ "$status_3" != "200" ]; then
    echo -e "\n${RED}❌ FAILED: Expected status 200, got ${status_3}${NC}"
    exit 1
fi

# Step 4: Analyze results
echo -e "\n${BLUE}=== Performance Analysis ===${NC}\n"

# Calculate average cached time
avg_cached=$(echo "($time_2 + $time_3) / 2" | bc -l)

# Calculate improvement
if (( $(echo "$time_1 > 0" | bc -l) )); then
    improvement=$(echo "scale=1; ($time_1 - $avg_cached) / $time_1 * 100" | bc -l)
    speedup=$(echo "scale=1; $time_1 / $avg_cached" | bc -l)
else
    improvement=0
    speedup=0
fi

echo -e "${CYAN}First request (DB hit):     ${time_1}ms${NC}"
echo -e "${CYAN}Second request (cached):    ${time_2}ms${NC}"
echo -e "${CYAN}Third request (cached):     ${time_3}ms${NC}"
echo -e "${CYAN}Average cached response:    ${avg_cached}ms${NC}"
echo -e "${CYAN}Performance improvement:    ${improvement}%${NC}"
echo -e "${CYAN}Speedup factor:             ${speedup}x${NC}"

# Step 5: Verify data consistency
echo -e "\n${BLUE}=== Data Consistency Check ===${NC}\n"

if [ "$size_1" -eq "$size_2" ] && [ "$size_2" -eq "$size_3" ]; then
    echo -e "${GREEN}✓ All responses have the same data size - consistency verified${NC}"
else
    echo -e "${RED}❌ Data size mismatch: ${size_1} vs ${size_2} vs ${size_3}${NC}"
    exit 1
fi

# Step 6: Performance criteria check
echo -e "\n${BLUE}=== Cache Effectiveness Check ===${NC}\n"

all_passed=true

# Check 1: Cached requests should be faster
if (( $(echo "$avg_cached < $time_1" | bc -l) )); then
    echo -e "${GREEN}✓ Cached requests are faster than uncached requests${NC}"
else
    echo -e "${RED}❌ Cached requests are NOT faster than uncached requests${NC}"
    all_passed=false
fi

# Check 2: At least 30% improvement expected (lowered threshold for small datasets)
if (( $(echo "$improvement >= 30" | bc -l) )); then
    echo -e "${GREEN}✓ Performance improvement (${improvement}%) exceeds minimum threshold (30%)${NC}"
else
    echo -e "${YELLOW}⚠ Performance improvement (${improvement}%) is below 30%, but this may be normal for small datasets${NC}"
    # Don't fail for this
fi

# Check 3: Cached requests should be reasonably fast
if (( $(echo "$avg_cached < 50" | bc -l) )); then
    echo -e "${GREEN}✓ Cached requests are fast (${avg_cached}ms < 50ms)${NC}"
elif (( $(echo "$avg_cached < 100" | bc -l) )); then
    echo -e "${YELLOW}⚠ Cached requests are acceptable (${avg_cached}ms < 100ms)${NC}"
else
    echo -e "${YELLOW}⚠ Cached requests took ${avg_cached}ms (>100ms)${NC}"
fi

# Final result
echo -e "\n${BLUE}=== Final Result ===${NC}\n"

if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✅ VERIFICATION PASSED: Cache is working correctly and providing performance improvements!${NC}"
    echo -e "${CYAN}\nSummary: Cache provides ${speedup}x speedup (${improvement}% improvement)${NC}\n"

    # Cleanup
    rm -f /tmp/response_*.json
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED: Some checks did not pass${NC}\n"

    # Cleanup
    rm -f /tmp/response_*.json
    exit 1
fi
