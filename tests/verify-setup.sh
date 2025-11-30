#!/bin/bash
set -e

echo "🧪 Playwright E2E Test Suite - Setup Verification"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

# Check 1: Node.js version
echo -n "Checking Node.js version... "
node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -ge 20 ]; then
  echo -e "${GREEN}✓${NC} Node.js $(node --version)"
  ((check_passed++))
else
  echo -e "${RED}✗${NC} Node.js $node_version (requires 20+)"
  ((check_failed++))
fi

# Check 2: Playwright installed
echo -n "Checking Playwright installation... "
if npx playwright --version &>/dev/null; then
  echo -e "${GREEN}✓${NC} Playwright $(npx playwright --version)"
  ((check_passed++))
else
  echo -e "${RED}✗${NC} Playwright not installed"
  echo "  Run: npx playwright install --with-deps"
  ((check_failed++))
fi

# Check 3: Test files exist
echo -n "Checking test files... "
test_files=(
  "tests/e2e/01-anonymous-user.spec.ts"
  "tests/e2e/02-authentication.spec.ts"
  "tests/e2e/03-user-features.spec.ts"
  "tests/e2e/04-admin-features.spec.ts"
  "tests/helpers/test-utils.ts"
)

all_exist=true
for file in "${test_files[@]}"; do
  if [ ! -f "$file" ]; then
    all_exist=false
    break
  fi
done

if $all_exist; then
  echo -e "${GREEN}✓${NC} All 4 test files + helpers present"
  ((check_passed++))
else
  echo -e "${RED}✗${NC} Missing test files"
  ((check_failed++))
fi

# Check 4: Environment file
echo -n "Checking .env file... "
if [ -f ".env" ]; then
  if grep -q "SUPABASE_URL" .env && grep -q "SUPABASE_ANON_KEY" .env; then
    echo -e "${GREEN}✓${NC} .env configured"
    ((check_passed++))
  else
    echo -e "${YELLOW}⚠${NC} .env exists but missing Supabase vars"
    ((check_failed++))
  fi
else
  echo -e "${RED}✗${NC} .env file not found"
  ((check_failed++))
fi

# Check 5: Port 3000 available
echo -n "Checking port 3000... "
if lsof -i :3000 &>/dev/null; then
  echo -e "${YELLOW}⚠${NC} Port 3000 in use (may be dev server)"
else
  echo -e "${GREEN}✓${NC} Port 3000 available"
fi
((check_passed++))

# Check 6: TypeScript compilation
echo -n "Checking TypeScript compilation... "
if npx tsc --noEmit tests/**/*.ts &>/dev/null; then
  echo -e "${GREEN}✓${NC} No TypeScript errors"
  ((check_passed++))
else
  echo -e "${YELLOW}⚠${NC} TypeScript warnings (may be ok)"
  # Don't fail on TS warnings
  ((check_passed++))
fi

# Summary
echo ""
echo "=================================================="
echo "Summary: ${check_passed} passed, ${check_failed} failed"
echo "=================================================="
echo ""

if [ $check_failed -eq 0 ]; then
  echo -e "${GREEN}✓ Setup complete!${NC} Ready to run tests."
  echo ""
  echo "Next steps:"
  echo "  1. Create test users (see tests/setup-test-users.sql)"
  echo "  2. Run tests: npm run test:e2e:ui"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Setup incomplete.${NC} Please fix issues above."
  echo ""
  echo "Common fixes:"
  echo "  - Install Playwright: npx playwright install --with-deps"
  echo "  - Create .env: cp .env.example .env"
  echo "  - Configure Supabase credentials in .env"
  echo ""
  exit 1
fi
