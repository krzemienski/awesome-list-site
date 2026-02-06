# Docker Deployment Verification Guide

This guide provides comprehensive steps to verify that Docker deployment works end-to-end.

## Quick Verification

For automated verification, use the provided script:

```bash
./scripts/verify-docker-deployment.sh
```

This script will automatically run all verification steps and provide a detailed report.

## Manual Verification Steps

If you prefer to run verification steps manually or need to troubleshoot, follow these steps:

### Prerequisites

- Docker and Docker Compose installed
- No existing containers running on port 5000 or 5432

### Step 1: Clean Start

Ensure no previous containers are running:

```bash
docker-compose down -v
```

### Step 2: Start Services

Start the application and database:

```bash
docker-compose up -d
```

**Expected Output:**
```
Creating network "awesome-list-site_default" with the default driver
Creating volume "awesome-list-site_postgres_data" with local driver
Creating awesome-list-db ... done
Creating awesome-list-app ... done
```

### Step 3: Check Service Status

Verify both services are running:

```bash
docker-compose ps
```

**Expected Output:**
```
Name                      Command                  State           Ports
----------------------------------------------------------------------------------
awesome-list-app   docker-entrypoint.sh node ...   Up      0.0.0.0:5000->5000/tcp
awesome-list-db    docker-entrypoint.sh postgres   Up      0.0.0.0:5432->5432/tcp
```

Both services should show `State: Up`.

### Step 4: Wait for PostgreSQL Health Check

The application depends on PostgreSQL being healthy. Check the database:

```bash
docker-compose exec postgres pg_isready -U postgres
```

**Expected Output:**
```
/var/run/postgresql:5432 - accepting connections
```

### Step 5: Test Health Check Endpoint

The health check endpoint should return JSON with database connectivity status:

```bash
curl http://localhost:5000/health
```

**Expected Output:**
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2024-02-01T12:00:00.000Z"
}
```

**HTTP Status:** Should be `200 OK`

If the database is not connected, the response will be:
```json
{
  "status": "degraded",
  "database": "disconnected",
  "version": "1.0.0",
  "timestamp": "2024-02-01T12:00:00.000Z"
}
```

**HTTP Status:** Should be `503 Service Unavailable`

### Step 6: Verify Database Migrations

Check application logs to confirm migrations ran:

```bash
docker-compose logs app | grep -i migration
```

**Expected Output:**
You should see log entries indicating migrations were executed, such as:
```
awesome-list-app | Running database migrations...
awesome-list-app | Migrations completed successfully
```

Alternatively, check the database directly for the migrations table:

```bash
docker-compose exec postgres psql -U postgres -d awesome_list -c "\dt __drizzle_migrations"
```

**Expected Output:**
```
                List of relations
 Schema |        Name          | Type  |  Owner
--------+----------------------+-------+----------
 public | __drizzle_migrations | table | postgres
```

### Step 7: Access Frontend

Open a browser and navigate to:

```
http://localhost:5000
```

**Expected Result:**
- The homepage should load successfully
- No console errors in browser developer tools
- The page should display the Awesome List Site interface

You can also test with curl:

```bash
curl -s http://localhost:5000 | grep -o "<title>.*</title>"
```

**Expected Output:**
```html
<title>Awesome List Site</title>
```

### Step 8: Test Local Authentication

The application should have local authentication endpoints available:

```bash
# Check if local auth endpoint exists (should return 405 Method Not Allowed for GET)
curl -i http://localhost:5000/api/auth/local/login
```

**Expected Output:**
```
HTTP/1.1 405 Method Not Allowed
...
```

This is correct - the endpoint exists but requires a POST request with credentials.

### Step 9: Verify Core Functionality

Test that the API is responding:

```bash
# Get all resources (should return JSON array)
curl -s http://localhost:5000/api/resources | jq '.' | head -20
```

**Expected Output:**
Should return a JSON array of resources (may be empty on first run).

### Step 10: Check Container Logs

View application logs to ensure no errors:

```bash
docker-compose logs app --tail=50
```

**Expected Output:**
You should see:
- Migration logs (if migrations ran)
- Server startup message
- No error stack traces
- Listening on port 5000 message

### Step 11: View Database Logs

Check PostgreSQL logs:

```bash
docker-compose logs postgres --tail=50
```

**Expected Output:**
- Database initialization logs
- Connection logs from the application
- No error messages

### Step 12: Cleanup

After verification, stop and remove containers:

```bash
# Stop containers but keep data
docker-compose down

# Stop containers and remove volumes (delete all data)
docker-compose down -v
```

## Troubleshooting

### Health Check Fails

If `curl http://localhost:5000/health` fails:

1. Check if the app container is running:
   ```bash
   docker-compose ps
   ```

2. View app logs for errors:
   ```bash
   docker-compose logs app
   ```

3. Check if the port is available:
   ```bash
   lsof -i :5000
   ```

### Database Connection Issues

If health check shows `"database": "disconnected"`:

1. Verify PostgreSQL is running:
   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify DATABASE_URL is correct in docker-compose.yml

### Migrations Not Running

If migrations don't appear in logs:

1. Check if NODE_ENV is set to production:
   ```bash
   docker-compose exec app env | grep NODE_ENV
   ```

2. Verify migrations folder exists in the container:
   ```bash
   docker-compose exec app ls -la /app/migrations
   ```

3. Check app logs for migration errors:
   ```bash
   docker-compose logs app | grep -i error
   ```

### Port Already in Use

If you see "port is already allocated":

1. Find the process using the port:
   ```bash
   lsof -i :5000  # or :5432 for database
   ```

2. Either stop that process or change the port in docker-compose.yml

### Container Exits Immediately

If the app container shows "Exited":

1. View exit logs:
   ```bash
   docker-compose logs app
   ```

2. Check Dockerfile build process:
   ```bash
   docker-compose build app
   ```

## Success Criteria

All of the following should be true:

- ✅ `docker-compose up -d` starts both services
- ✅ Both containers show "Up" status in `docker-compose ps`
- ✅ Health check returns 200 OK with proper JSON
- ✅ Health check shows `"database": "connected"`
- ✅ Frontend is accessible at http://localhost:5000
- ✅ No errors in application logs
- ✅ Migrations table exists in database
- ✅ Local auth endpoint exists

If all criteria pass, Docker deployment is working correctly! 🎉

## CI/CD Integration

This verification can be automated in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Test Docker Deployment
  run: |
    docker-compose up -d
    sleep 10
    curl -f http://localhost:5000/health || exit 1
    docker-compose down -v
```

## Additional Resources

- [Docker Documentation](../docs/DOCKER.md) - Full Docker setup guide
- [Deployment Guide](../docs/DEPLOYMENT.md) - Multi-platform deployment
- [Environment Variables](../docs/ENVIRONMENT.md) - Configuration reference
