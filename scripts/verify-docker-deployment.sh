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

# Check if .env file exists, if not use docker-compose defaults
if [ ! -f .env ]; then
    print_warning ".env file not found, using docker-compose.yml defaults"
fi

# Step 2: Clean up any existing containers
print_step "Step 2: Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true
print_success "Cleanup complete"

# Step 3: Start services
print_step "Step 3: Starting services with docker-compose up -d..."
if docker-compose up -d; then
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
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL failed to start in time"
    docker-compose logs postgres
    exit 1
fi

# Step 5: Wait for application to start
print_step "Step 5: Waiting for application to start..."
sleep 5  # Give app time to run migrations and start

# Step 6: Check health endpoint
print_step "Step 6: Testing health check endpoint..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTH_CHECK_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")

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
    print_success "Health check endpoint returned 200 OK"

    # Get health check response
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
    echo "Health check response: $HEALTH_RESPONSE"

    # Verify it contains expected fields
    if echo "$HEALTH_RESPONSE" | grep -q "status"; then
        print_success "Health response contains 'status' field"
    else
        print_error "Health response missing 'status' field"
    fi

    if echo "$HEALTH_RESPONSE" | grep -q "database"; then
        print_success "Health response contains 'database' field"
    else
        print_error "Health response missing 'database' field"
    fi
else
    print_error "Health check endpoint did not return 200 OK (got $HTTP_STATUS)"
    print_warning "Application logs:"
    docker-compose logs app | tail -20
fi

# Step 7: Verify database migrations ran
print_step "Step 7: Verifying database migrations..."
MIGRATION_LOGS=$(docker-compose logs app | grep -i "migration" || echo "")
if [ -n "$MIGRATION_LOGS" ]; then
    print_success "Found migration logs"
    echo "$MIGRATION_LOGS"
else
    print_warning "No migration logs found (migrations may have run silently)"
fi

# Check if migrations table exists
MIGRATIONS_TABLE_EXISTS=$(docker-compose exec -T postgres psql -U postgres -d awesome_list -c "\dt __drizzle_migrations" 2>&1 | grep -c "__drizzle_migrations" || echo "0")
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

# Step 9: Check if local auth endpoint exists
print_step "Step 9: Checking local authentication endpoints..."
LOCAL_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/local/login 2>/dev/null || echo "000")
if [ "$LOCAL_AUTH_STATUS" = "405" ] || [ "$LOCAL_AUTH_STATUS" = "200" ]; then
    print_success "Local auth endpoint exists (status: $LOCAL_AUTH_STATUS)"
else
    print_warning "Local auth endpoint status: $LOCAL_AUTH_STATUS (may require POST request)"
fi

# Step 10: Show running containers
print_step "Step 10: Listing running containers..."
docker-compose ps

# Step 11: Summary
print_step "Verification Summary"
echo "=================================="
if [ "$VERIFICATION_PASSED" = true ]; then
    print_success "All verification steps passed!"
    echo ""
    echo "You can now:"
    echo "  - Access the app at: http://localhost:5000"
    echo "  - Check health at: http://localhost:5000/health"
    echo "  - View logs: docker-compose logs -f app"
    echo ""
    echo "To stop the services:"
    echo "  docker-compose down"
    echo ""
    echo "To stop and remove volumes:"
    echo "  docker-compose down -v"
else
    print_error "Some verification steps failed. Please review the output above."
    echo ""
    echo "Troubleshooting:"
    echo "  - View app logs: docker-compose logs app"
    echo "  - View database logs: docker-compose logs postgres"
    echo "  - Check all logs: docker-compose logs"
fi
echo "=================================="

# Ask user if they want to keep containers running
echo ""
read -p "Do you want to stop the containers now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Stopping containers..."
    docker-compose down
    print_success "Containers stopped"
fi

exit 0
