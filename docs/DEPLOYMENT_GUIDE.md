# Production Deployment Guide

**Awesome Video Resources Platform**

This guide covers deploying the application to a production environment using Docker Compose with SSL, monitoring, and best practices.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Docker Deployment](#docker-deployment)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)
11. [Security Checklist](#security-checklist)

---

## Prerequisites

- **Docker**: v24.0+ with Docker Compose v2.20+
- **Domain**: Configured DNS pointing to your server
- **SSL Certificate**: Let's Encrypt (free) or commercial certificate
- **Supabase Project**: With database credentials
- **API Keys**: Anthropic (Claude), GitHub token (optional)

---

## Server Requirements

### Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB SSD | 50 GB SSD |
| Bandwidth | 1 TB/month | Unlimited |

### Supported Operating Systems

- Ubuntu 22.04 LTS (recommended)
- Debian 12
- Amazon Linux 2023
- Any Linux with Docker support

---

## Initial Setup

### 1. Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/awesome-list-site.git
cd awesome-list-site
```

### 3. Create Directory Structure

```bash
# Create required directories
mkdir -p docker/nginx/ssl
mkdir -p logs

# Set permissions
chmod 755 docker/nginx/ssl
chmod 755 logs
```

---

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.example .env.production
chmod 600 .env.production
```

### 2. Configure Environment Variables

Edit `.env.production` with your production values:

```bash
# ===========================================
# SUPABASE CONFIGURATION (Required)
# ===========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres

# ===========================================
# REDIS CACHE (Auto-configured in Docker)
# ===========================================
REDIS_URL=redis://redis:6379

# ===========================================
# GITHUB INTEGRATION (Optional)
# ===========================================
GITHUB_TOKEN=ghp_your_github_token

# ===========================================
# AI SERVICES (Required for AI features)
# ===========================================
ANTHROPIC_API_KEY=sk-ant-your-api-key
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-your-api-key
OPENAI_API_KEY=

# ===========================================
# APPLICATION SETTINGS
# ===========================================
NODE_ENV=production
PORT=3000
WEBSITE_URL=https://your-domain.com
```

### Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Auto | Redis connection (set by Docker) |
| `GITHUB_TOKEN` | No | GitHub PAT for sync features |
| `ANTHROPIC_API_KEY` | No | Claude API for AI tagging |
| `WEBSITE_URL` | Yes | Production URL for CORS/redirects |

### 3. Client Environment

Create `client/.env.production`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Setup

### Supabase Database (Recommended)

The application uses Supabase PostgreSQL. Database schema is managed via Drizzle ORM.

#### Initial Schema Push

```bash
# From local development machine with DATABASE_URL set
npm run db:push
```

#### Verify Database Tables

Connect to Supabase SQL Editor and verify these tables exist:

```sql
-- Core tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 16 tables
-- categories, subcategories, sub_subcategories, resources
-- users, favorites, bookmarks, preferences, journey_progress
-- enrichment_jobs, github_sync_history, audit_log, etc.
```

### Database Migrations

For schema changes in production:

```bash
# Generate migration (development)
npx drizzle-kit generate

# Review generated SQL in ./migrations/

# Apply to production
DATABASE_URL=your-prod-url npx drizzle-kit push
```

### Row-Level Security (RLS)

User data tables have RLS policies. Verify they are enabled:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('favorites', 'bookmarks', 'preferences', 'journey_progress');
```

---

## SSL/TLS Configuration

### Option A: Let's Encrypt with Certbot (Recommended)

#### 1. Install Certbot

```bash
sudo apt update
sudo apt install certbot
```

#### 2. Obtain Certificate (Standalone Mode)

```bash
# Stop any service on port 80
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

#### 3. Copy Certificates

```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/
sudo chown $USER:$USER docker/nginx/ssl/*.pem
chmod 600 docker/nginx/ssl/*.pem
```

#### 4. Auto-Renewal Cron

```bash
# Add to crontab
0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/app/docker/nginx/ssl/ && docker compose restart nginx
```

### Option B: Commercial Certificate

Place your certificate files:
- `docker/nginx/ssl/fullchain.pem` - Certificate chain
- `docker/nginx/ssl/privkey.pem` - Private key

### Update Nginx Configuration

Replace `docker/nginx/nginx.conf` with SSL-enabled version:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # HTTP -> HTTPS Redirect
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

        # Proxy to web service
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;

            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth endpoints stricter rate limiting
        location ~ ^/api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            limit_req_status 429;

            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check (no rate limit)
        location = /api/health {
            proxy_pass http://web;
            access_log off;
        }
    }
}
```

---

## Docker Deployment

### 1. Build and Start Services

```bash
# Load environment
set -a && source .env.production && set +a

# Build images
docker compose build --no-cache

# Start all services
docker compose up -d

# Verify containers are running
docker compose ps
```

### 2. Expected Container Status

```
NAME                  STATUS                   PORTS
awesome-list-redis    Up (healthy)            0.0.0.0:6379->6379/tcp
awesome-list-web      Up (healthy)            0.0.0.0:3000->3000/tcp
awesome-list-nginx    Up                      0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 3. Verify Deployment

```bash
# Check health endpoint
curl -k https://your-domain.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-...",
  "cache": { "status": "connected", ... },
  "database": "connected"
}
```

### 4. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f nginx

# Application logs
tail -f logs/app.log
```

### 5. Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart web

# Full rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Monitoring & Health Checks

### Built-in Health Endpoint

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T00:00:00.000Z",
  "cache": {
    "status": "connected",
    "keys": 150,
    "hits": 12500,
    "misses": 2300
  },
  "database": "connected"
}
```

### Docker Health Checks

All services have built-in health checks:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' awesome-list-web
docker inspect --format='{{.State.Health.Status}}' awesome-list-redis
```

### External Monitoring Setup

#### UptimeRobot / Pingdom Configuration

| Check Type | URL | Interval | Alert Threshold |
|------------|-----|----------|-----------------|
| HTTPS | `https://your-domain.com/api/health` | 5 min | 2 failures |
| Keyword | Check for `"status":"ok"` | 5 min | 1 failure |

#### Prometheus Metrics (Optional)

Add to your Prometheus config:

```yaml
scrape_configs:
  - job_name: 'awesome-list'
    static_configs:
      - targets: ['your-domain.com']
    metrics_path: /api/health
    scheme: https
```

### Log Aggregation

#### Recommended: Loki + Grafana

```yaml
# Add to docker-compose.yml
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - ./logs:/var/log/app
      - ./promtail-config.yml:/etc/promtail/config.yml
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```

---

## Backup & Recovery

### Redis Cache

Redis is configured with persistence (`appendonly yes`). Data survives restarts.

```bash
# Manual backup
docker exec awesome-list-redis redis-cli BGSAVE
docker cp awesome-list-redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb

# Restore
docker cp ./backups/redis-backup.rdb awesome-list-redis:/data/dump.rdb
docker compose restart redis
```

### Application Logs

```bash
# Archive logs
tar -czvf logs-$(date +%Y%m%d).tar.gz logs/

# Rotate logs (add to crontab)
0 0 * * 0 find /path/to/app/logs -name "*.log" -mtime +30 -delete
```

### Database (Supabase)

Supabase provides automatic daily backups. For manual backup:

```bash
# Export via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or use Supabase Dashboard > Database > Backups
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker compose logs web

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

#### 2. Redis Connection Failed

```bash
# Verify Redis is running
docker exec awesome-list-redis redis-cli ping
# Expected: PONG

# Check network
docker network inspect awesome-list-site_app-network
```

#### 3. Database Connection Issues

```bash
# Test from web container
docker exec awesome-list-web node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(r => console.log('Connected:', r.rows[0])).catch(console.error);
"
```

#### 4. SSL Certificate Errors

```bash
# Verify certificate files exist
ls -la docker/nginx/ssl/

# Check certificate validity
openssl x509 -in docker/nginx/ssl/fullchain.pem -text -noout | grep -A2 "Validity"

# Test SSL
curl -vI https://your-domain.com
```

#### 5. 502 Bad Gateway

```bash
# Check if web service is healthy
docker compose ps
docker compose logs web

# Restart web service
docker compose restart web
```

### Debug Mode

```bash
# Run web service interactively
docker compose run --rm -e NODE_ENV=development web npm run dev
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in `.env.production` (not committed to git)
- [ ] `.env.production` has restrictive permissions (`chmod 600`)
- [ ] SSL certificates installed and valid
- [ ] SUPABASE_SERVICE_ROLE_KEY only on server (never in client)
- [ ] Rate limiting configured in nginx

### Post-Deployment

- [ ] HTTPS redirect working (HTTP -> HTTPS)
- [ ] Security headers present (X-Frame-Options, etc.)
- [ ] Health endpoint accessible
- [ ] RLS policies verified on user tables
- [ ] Admin endpoints require authentication

### Ongoing

- [ ] SSL certificate renewal automated
- [ ] Log rotation configured
- [ ] Monitoring alerts configured
- [ ] Regular security updates for Docker images

### Security Hardening Commands

```bash
# Update Docker images
docker compose pull
docker compose up -d

# Check for vulnerabilities
docker scout cves awesome-list-web

# Verify no secrets in image
docker history awesome-list-web --no-trunc | grep -i secret
```

---

## Quick Reference

### Essential Commands

```bash
# Deploy
docker compose up -d

# Stop
docker compose down

# Rebuild
docker compose build --no-cache && docker compose up -d

# Logs
docker compose logs -f web

# Shell access
docker exec -it awesome-list-web sh

# Health check
curl https://your-domain.com/api/health
```

### File Locations

| File | Purpose |
|------|---------|
| `.env.production` | Production secrets |
| `docker-compose.yml` | Container orchestration |
| `Dockerfile` | Application image |
| `docker/nginx/nginx.conf` | Reverse proxy config |
| `docker/nginx/ssl/` | SSL certificates |
| `logs/` | Application logs |

### Ports

| Service | Internal | External |
|---------|----------|----------|
| Web App | 3000 | 3000 |
| Nginx | 80, 443 | 80, 443 |
| Redis | 6379 | 6379 (optional) |

---

## Support

- **Issues**: Check `docker compose logs` first
- **Database**: Supabase Dashboard > Logs
- **Performance**: `/api/health` endpoint metrics
- **Documentation**: `docs/` directory

---

*Last Updated: 2024-12-02*
