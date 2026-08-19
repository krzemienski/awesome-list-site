#!/bin/bash
# Docker Deployment End-to-End Verification Script
# This script verifies that Docker deployment works correctly

set -e  # Exit on error

echo "=================================="
echo "Docker Deployment Verification"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall success
VERIFICATION_PASSED=true

# Helper function to print step
print_step() {
    echo ""
    echo "===> $1"
}

# Helper function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Helper function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
    VERIFICATION_PASSED=false
}

# Helper function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Step 1: Check prerequisites
print_step "Step 1: Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
print_success "Docker is installed"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_success "Docker Compose is installed"

# Clerk keys are required by docker-compose.yml.
if [ ! -f .env ]; then
    print_error ".env file not found (Clerk publishable and secret keys are required)"
    exit 1
fi

# Step 2: Clean up any existing containers
print_step "Step 2: Cleaning up existing containers..."
docker compose down -v 2>/dev/null || true
print_success "Cleanup complete"

# Step 3: Start services
print_step "Step 3: Starting services with docker compose up -d..."
if docker compose up -d; then
    print_success "Services started successfully"
else
    print_error "Failed to start services"
    exit 1
fi

# Step 4: Wait for services to be healthy
print_step "Step 4: Waiting for services to be healthy..."
echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL failed to start in time"
    docker compose logs postgres
    exit 1
fi

# Step 5: Wait for application to start
print_step "Step 5: Waiting for application to start..."
sleep 5  # Give app time to run migrations and start

# Step 6: Check process liveness and database readiness
print_step "Step 6: Testing liveness and readiness endpoints..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTH_CHECK_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health/ready 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        HEALTH_CHECK_PASSED=true
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done
echo ""

if [ "$HEALTH_CHECK_PASSED" = true ]; then
    print_success "Readiness endpoint returned 200 OK"

    LIVENESS_RESPONSE=$(curl -s http://localhost:5000/api/health/live)
    READINESS_RESPONSE=$(curl -s http://localhost:5000/api/health/ready)
    echo "Liveness response: $LIVENESS_RESPONSE"
    echo "Readiness response: $READINESS_RESPONSE"

    if echo "$LIVENESS_RESPONSE" | grep -q '"status":"ok"'; then
        print_success "Process liveness is OK"
    else
        print_error "Unexpected liveness response"
    fi

    if echo "$READINESS_RESPONSE" | grep -q '"status":"ready"'; then
        print_success "Database-dependent readiness is OK"
    else
        print_error "Unexpected readiness response"
    fi
else
    print_error "Readiness endpoint did not return 200 OK (got $HTTP_STATUS)"
    print_warning "Application logs:"
    docker compose logs app | tail -20
fi

# Step 7: Verify database migrations ran
print_step "Step 7: Verifying database migrations..."
MIGRATION_LOGS=$(docker compose logs app | grep -i "migration" || echo "")
if [ -n "$MIGRATION_LOGS" ]; then
    print_success "Found migration logs"
    echo "$MIGRATION_LOGS"
else
    print_warning "No migration logs found (migrations may have run silently)"
fi

# Check if migrations table exists
MIGRATIONS_TABLE_EXISTS=$(docker compose exec -T postgres psql -U postgres -d awesome_list -c "\dt drizzle.__drizzle_migrations" 2>&1 | grep -c "__drizzle_migrations" || echo "0")
if [ "$MIGRATIONS_TABLE_EXISTS" -gt 0 ]; then
    print_success "Migrations table exists in database"
else
    print_error "Migrations table not found in database"
fi

# Step 8: Test frontend accessibility
print_step "Step 8: Testing frontend accessibility..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_success "Frontend accessible at http://localhost:5000/"
else
    print_error "Frontend returned status $FRONTEND_STATUS"
fi

# Step 9: Confirm the removed local auth endpoint stays gone (auth is Clerk-based now)
print_step "Step 9: Checking local authentication endpoint is removed..."
LOCAL_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/local/login 2>/dev/null || echo "000")
if [ "$LOCAL_AUTH_STATUS" = "404" ]; then
    print_success "Local auth endpoint correctly absent (404) — auth is handled by Clerk"
else
    print_error "Local auth endpoint returned $LOCAL_AUTH_STATUS (expected 404; password login was removed)"
fi

# Step 10: Show running containers
print_step "Step 10: Listing running containers..."
docker compose ps

# Step 11: Summary
print_step "Verification Summary"
echo "=================================="
if [ "$VERIFICATION_PASSED" = true ]; then
    print_success "All verification steps passed!"
    echo ""
    echo "You can now:"
    echo "  - Access the app at: http://localhost:5000"
    echo "  - Check liveness at: http://localhost:5000/api/health/live"
    echo "  - Check readiness at: http://localhost:5000/api/health/ready"
    echo "  - View logs: docker compose logs -f app"
    echo ""
    echo "To stop the services:"
    echo "  docker compose down"
    echo ""
    echo "To stop and remove volumes:"
    echo "  docker compose down -v"
else
    print_error "Some verification steps failed. Please review the output above."
    echo ""
    echo "Troubleshooting:"
    echo "  - View app logs: docker compose logs app"
    echo "  - View database logs: docker compose logs postgres"
    echo "  - Check all logs: docker compose logs"
fi
echo "=================================="

# Ask user if they want to keep containers running
echo ""
read -p "Do you want to stop the containers now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Stopping containers..."
    docker compose down
    print_success "Containers stopped"
fi

# Exit nonzero if any verification step failed so CI/operators see it
if [ "$VERIFICATION_PASSED" = true ]; then
    exit 0
else
    exit 1
fi
