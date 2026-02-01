# Docker Deployment Guide

This guide covers running the Awesome List Site using Docker and Docker Compose for local development and self-hosting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Docker Commands](#docker-commands)
- [Volume Management](#volume-management)
- [Accessing Logs](#accessing-logs)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker**: Version 20.10 or higher
  - [Install Docker Desktop](https://docs.docker.com/get-docker/) (macOS/Windows)
  - [Install Docker Engine](https://docs.docker.com/engine/install/) (Linux)
- **Docker Compose**: Version 2.0 or higher (included with Docker Desktop)
- **Git**: For cloning the repository

Verify your installation:

```bash
docker --version
docker-compose --version
```

## Quick Start

Get the application running in three simple steps:

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd awesome-list-site
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

The application will be available at `http://localhost:5000` after the containers start (typically 30-60 seconds).

To verify the application is running:

```bash
curl http://localhost:5000/health
```

You should receive a JSON response with `status: "ok"`.

## Environment Setup

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/awesome_list_site

# Server Configuration
NODE_ENV=production
PORT=5000

# Session Security
SESSION_SECRET=your-secret-key-change-this-in-production

# Optional: AI Features
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Optional: GitHub Integration
GITHUB_TOKEN=your-github-token

# Optional: Replit OAuth (not needed for Docker deployment)
# REPL_ID=your-repl-id
# ISSUER_URL=your-issuer-url
```

**Important Security Notes:**
- **Never commit your `.env` file** to version control
- Use strong, randomly generated values for `SESSION_SECRET`
- Generate a secure session secret: `openssl rand -base64 32`
- Keep your API keys secure and rotate them regularly

### Configuration Files

The Docker setup includes:

- **`Dockerfile`**: Multi-stage build for optimized production images
- **`docker-compose.yml`**: Local development orchestration with PostgreSQL
- **`.dockerignore`**: Excludes unnecessary files from the Docker build context

## Docker Commands

### Starting the Application

Start all services in detached mode:
```bash
docker-compose up -d
```

Start and view logs:
```bash
docker-compose up
```

### Stopping the Application

Stop all services:
```bash
docker-compose down
```

Stop and remove volumes (⚠️ **deletes all data**):
```bash
docker-compose down -v
```

### Restarting Services

Restart all services:
```bash
docker-compose restart
```

Restart a specific service:
```bash
docker-compose restart app
docker-compose restart postgres
```

### Rebuilding Images

Rebuild and restart after code changes:
```bash
docker-compose up -d --build
```

Force rebuild without cache:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Service Status

Check running services:
```bash
docker-compose ps
```

View resource usage:
```bash
docker stats
```

## Volume Management

### Understanding Volumes

Docker Compose creates persistent volumes for:

- **`postgres_data`**: PostgreSQL database files
- **Node modules**: Cached dependencies (optional optimization)

### Backing Up Data

Backup the PostgreSQL database:

```bash
# Create a database dump
docker-compose exec postgres pg_dump -U postgres awesome_list_site > backup.sql

# With timestamp
docker-compose exec postgres pg_dump -U postgres awesome_list_site > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restoring Data

Restore from a backup:

```bash
# Stop the application
docker-compose down

# Start only the database
docker-compose up -d postgres

# Wait for database to be ready
sleep 5

# Restore the dump
docker-compose exec -T postgres psql -U postgres awesome_list_site < backup.sql

# Start all services
docker-compose up -d
```

### Cleaning Up Volumes

List all volumes:
```bash
docker volume ls
```

Remove unused volumes:
```bash
docker volume prune
```

Remove project volumes (⚠️ **deletes all data**):
```bash
docker-compose down -v
```

## Accessing Logs

### View All Logs

View logs from all services:
```bash
docker-compose logs
```

Follow logs in real-time:
```bash
docker-compose logs -f
```

### Service-Specific Logs

View logs from a specific service:
```bash
docker-compose logs app
docker-compose logs postgres
```

Follow logs from a specific service:
```bash
docker-compose logs -f app
```

### Tail Logs

View the last 100 lines:
```bash
docker-compose logs --tail=100 app
```

View logs since a specific time:
```bash
docker-compose logs --since 30m app
```

### Debug Container Issues

Access a running container shell:
```bash
docker-compose exec app sh
```

Inspect container details:
```bash
docker-compose exec app env
docker-compose exec app ps aux
```

## Troubleshooting

### Port Already in Use

**Error**: `Bind for 0.0.0.0:5000 failed: port is already allocated`

**Solution**: Change the port in `docker-compose.yml` or stop the conflicting service:

```bash
# Find what's using port 5000
lsof -i :5000

# Or change the port mapping in docker-compose.yml
ports:
  - "3000:5000"  # Map to port 3000 instead
```

### Database Connection Errors

**Error**: `Connection refused` or `Database connection failed`

**Solution**: Ensure the database is ready:

```bash
# Check if postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart the database
docker-compose restart postgres

# Wait for database to be ready, then restart app
sleep 10
docker-compose restart app
```

### Permission Issues

**Error**: `EACCES: permission denied`

**Solution**: Check file permissions or run with appropriate user:

```bash
# Linux: Fix ownership
sudo chown -R $USER:$USER .

# Or run containers as your user (add to docker-compose.yml)
user: "${UID}:${GID}"
```

### Out of Memory

**Error**: Container crashes or becomes unresponsive

**Solution**: Increase Docker memory limit:

- **Docker Desktop**: Settings → Resources → Memory (allocate 4GB+)
- **Linux**: Adjust Docker daemon configuration

### Build Failures

**Error**: `npm install` fails or build errors

**Solution**: Clean build and rebuild:

```bash
# Remove all containers and images
docker-compose down --rmi all

# Clear Docker cache
docker builder prune -a

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Health Check Failures

**Error**: Container constantly restarts

**Solution**: Check the health endpoint and logs:

```bash
# View container logs
docker-compose logs app

# Check health status
docker-compose ps

# Access health endpoint directly
docker-compose exec app wget -O- http://localhost:5000/health
```

### Database Migration Issues

**Error**: Database schema is outdated

**Solution**: Run migrations manually:

```bash
# Run migrations
docker-compose exec app npm run db:push

# Or restart the app (migrations run on startup)
docker-compose restart app
```

## Production Deployment

### Building Production Image

Build the production image:

```bash
docker build -t awesome-list-site:latest .
```

Tag for registry:

```bash
docker tag awesome-list-site:latest your-registry.com/awesome-list-site:latest
```

Push to registry:

```bash
docker push your-registry.com/awesome-list-site:latest
```

### Production Best Practices

1. **Use External Database**: Don't run PostgreSQL in the same Docker Compose for production
   ```env
   DATABASE_URL=postgresql://user:pass@production-db-host:5432/dbname
   ```

2. **Set Resource Limits**: Add to `docker-compose.yml`:
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
           reservations:
             cpus: '1'
             memory: 1G
   ```

3. **Enable Health Checks**: Already configured in Dockerfile
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
     CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1
   ```

4. **Use Secrets Management**: Use Docker secrets or environment injection
   ```bash
   docker secret create session_secret ./session_secret.txt
   ```

5. **Enable Logging**: Configure log drivers
   ```yaml
   services:
     app:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

6. **Run as Non-Root**: Already configured in Dockerfile
   ```dockerfile
   USER node
   ```

### Monitoring

Monitor container health:

```bash
# Health check status
docker inspect --format='{{.State.Health.Status}}' awesome-list-site_app_1

# Container metrics
docker stats awesome-list-site_app_1
```

### Scaling

Scale the application (requires load balancer):

```bash
docker-compose up -d --scale app=3
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

For deployment to cloud platforms, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For environment variable documentation, see [ENVIRONMENT.md](./ENVIRONMENT.md).
