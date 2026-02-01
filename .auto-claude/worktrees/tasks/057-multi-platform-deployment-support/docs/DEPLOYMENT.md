# Deployment Guide

This guide covers deploying the Awesome List Site to various cloud platforms including Vercel, Railway, AWS, GCP, and Azure. Choose the platform that best fits your needs.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Platform Comparison](#platform-comparison)
- [Vercel Deployment](#vercel-deployment)
- [Railway Deployment](#railway-deployment)
- [AWS Deployment](#aws-deployment)
- [GCP Cloud Run](#gcp-cloud-run)
- [Azure Container Apps](#azure-container-apps)
- [Replit Deployment](#replit-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Platform-Specific Considerations](#platform-specific-considerations)

## Overview

The Awesome List Site is designed to deploy on any cloud platform with minimal configuration. The application:

- **Works without Replit**: Replit-specific features are optional and gracefully disabled when not detected
- **Database agnostic**: Works with any PostgreSQL-compatible database (tested with PostgreSQL 14+, Neon, AWS RDS, GCP Cloud SQL)
- **Health monitoring**: Built-in `/health` endpoint for platform health checks
- **Auto-migrations**: Database migrations run automatically on startup in production mode
- **Serverless ready**: Compatible with both traditional containers and serverless platforms

## Prerequisites

Before deploying to any platform, ensure you have:

1. **A PostgreSQL database**:
   - Managed database (Neon, AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL)
   - Or self-hosted using Docker (see [DOCKER.md](./DOCKER.md))

2. **Git repository**:
   - Code hosted on GitHub, GitLab, or Bitbucket
   - Repository accessible to your deployment platform

3. **Environment variables ready**:
   - See [.env.example](../.env.example) for required configuration
   - At minimum: `DATABASE_URL` and `NODE_ENV=production`

4. **Platform account**:
   - Create an account on your chosen platform (Vercel, Railway, AWS, etc.)

## Platform Comparison

| Platform | Type | Best For | Pricing | Setup Time |
|----------|------|----------|---------|------------|
| **Vercel** | Serverless | Quick deployment, frontend-focused teams | Free tier available | ~5 minutes |
| **Railway** | Container | Simple container deployment, persistent storage | $5/month + usage | ~10 minutes |
| **AWS ECS** | Container | Enterprise, full AWS integration | Pay per use | ~30 minutes |
| **AWS Elastic Beanstalk** | Platform | Managed AWS deployment | Pay per use | ~15 minutes |
| **GCP Cloud Run** | Container | Serverless containers, auto-scaling | Pay per use | ~15 minutes |
| **Azure Container Apps** | Container | Microsoft ecosystem, enterprise | Pay per use | ~20 minutes |
| **Replit** | Platform | Development, prototyping | Free tier available | ~5 minutes |
| **Docker** | Self-hosted | Full control, on-premise | Infrastructure cost | ~15 minutes |

## Vercel Deployment

Vercel is a serverless platform optimized for frontend frameworks with excellent developer experience.

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### Manual Deployment

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Connect your repository**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Select the repository containing the Awesome List Site

3. **Configure build settings**:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. **Set environment variables**:
   ```bash
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   NODE_ENV=production
   ```

5. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Your site will be live at `https://your-project.vercel.app`

### Vercel CLI Deployment

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Configuration

The project includes a `vercel.json` configuration file:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "routes": [
    { "src": "/api/(.*)", "dest": "dist/index.js" },
    { "src": "/health", "dest": "dist/index.js" },
    { "src": "/(.*)", "dest": "dist/index.js" }
  ]
}
```

### Vercel Limitations

- **10-second timeout**: Serverless functions have a 10-second execution limit on Hobby plan
- **No WebSockets**: Vercel doesn't support long-lived WebSocket connections on Hobby plan
- **Cold starts**: Expect 1-3 second cold start times for infrequent requests
- **Database connections**: Use connection pooling (Neon, PgBouncer) to avoid exhausting connections

### Recommended Vercel Setup

1. **Database**: Use [Neon](https://neon.tech) for serverless PostgreSQL with connection pooling
2. **Environment**: Set `NODE_ENV=production` to enable migrations on startup
3. **Monitoring**: Enable Vercel Analytics for performance insights
4. **Domain**: Configure custom domain in Vercel dashboard

## Railway Deployment

Railway is a modern platform that simplifies container deployment with persistent storage and automatic SSL.

### Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Manual Deployment

1. **Create Railway account**:
   - Sign up at [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Create new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL database** (optional if using external DB):
   - Click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will create a database and set `DATABASE_URL` automatically

4. **Configure service**:
   - Railway auto-detects the Dockerfile
   - Or configure manually:
     - **Build**: Dockerfile
     - **Start Command**: `node dist/index.js`
     - **Health Check**: `/health`

5. **Set environment variables**:
   ```bash
   NODE_ENV=production
   # DATABASE_URL is auto-set if using Railway PostgreSQL
   ```

6. **Deploy**:
   - Railway automatically builds and deploys
   - Get your public URL from the deployment settings

### Railway Configuration

Create `railway.json` (optional, auto-detected from Dockerfile):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Railway Best Practices

1. **Database**: Use Railway's PostgreSQL service for automatic `DATABASE_URL` configuration
2. **Volumes**: Add volumes for persistent storage if needed
3. **Scaling**: Configure auto-scaling based on CPU/memory usage
4. **Domains**: Add custom domain in Railway dashboard
5. **Monitoring**: Use Railway's built-in logs and metrics

## AWS Deployment

AWS offers multiple deployment options. Choose based on your team's expertise and requirements.

### Option 1: AWS ECS (Elastic Container Service)

Best for: Teams familiar with AWS, requiring fine-grained control over infrastructure.

#### Prerequisites

- AWS CLI installed and configured
- Docker installed locally
- AWS ECR repository created

#### Deployment Steps

1. **Build and push Docker image**:
   ```bash
   # Authenticate Docker to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build image
   docker build -t awesome-list-site .

   # Tag image
   docker tag awesome-list-site:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/awesome-list-site:latest

   # Push to ECR
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/awesome-list-site:latest
   ```

2. **Create RDS PostgreSQL database**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier awesome-list-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username postgres \
     --master-user-password <your-password> \
     --allocated-storage 20
   ```

3. **Create ECS task definition** (`task-definition.json`):
   ```json
   {
     "family": "awesome-list-site",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "containerDefinitions": [
       {
         "name": "awesome-list-site",
         "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/awesome-list-site:latest",
         "portMappings": [
           {
             "containerPort": 5000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           },
           {
             "name": "DATABASE_URL",
             "value": "postgresql://postgres:<password>@<rds-endpoint>:5432/awesome_list_site"
           }
         ],
         "healthCheck": {
           "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1"],
           "interval": 30,
           "timeout": 5,
           "retries": 3,
           "startPeriod": 60
         },
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/awesome-list-site",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

4. **Register task definition**:
   ```bash
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   ```

5. **Create ECS service**:
   ```bash
   aws ecs create-service \
     --cluster <your-cluster> \
     --service-name awesome-list-site \
     --task-definition awesome-list-site \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}"
   ```

6. **Configure Application Load Balancer**:
   - Create ALB targeting port 5000
   - Configure health check path: `/health`
   - Set up target group with ECS service

### Option 2: AWS Elastic Beanstalk

Best for: Simplified AWS deployment without managing infrastructure.

#### Deployment Steps

1. **Install EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize Elastic Beanstalk**:
   ```bash
   eb init -p docker awesome-list-site --region us-east-1
   ```

3. **Create environment**:
   ```bash
   eb create production-env
   ```

4. **Set environment variables**:
   ```bash
   eb setenv NODE_ENV=production DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

5. **Deploy**:
   ```bash
   eb deploy
   ```

6. **Open application**:
   ```bash
   eb open
   ```

#### Elastic Beanstalk Configuration

Create `.ebextensions/01-health.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health
    HealthCheckInterval: 30
    HealthCheckTimeout: 5
    UnhealthyThresholdCount: 3
    HealthyThresholdCount: 2
```

### AWS Security Groups

Ensure your security groups allow:

- **Inbound**: Port 5000 (or configured PORT) from Load Balancer
- **Outbound**: Port 5432 to RDS PostgreSQL database
- **Outbound**: Port 443 for external HTTPS connections

## GCP Cloud Run

Google Cloud Run provides serverless container deployment with automatic scaling.

### Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- Cloud SQL PostgreSQL instance (or external database)

### Deployment Steps

1. **Enable required APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   ```

2. **Create Cloud SQL PostgreSQL instance** (optional):
   ```bash
   gcloud sql instances create awesome-list-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

3. **Create database**:
   ```bash
   gcloud sql databases create awesome_list_site --instance=awesome-list-db
   ```

4. **Build and push container to GCR**:
   ```bash
   # Configure Docker for GCR
   gcloud auth configure-docker

   # Build image
   docker build -t gcr.io/<project-id>/awesome-list-site:latest .

   # Push to GCR
   docker push gcr.io/<project-id>/awesome-list-site:latest
   ```

5. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy awesome-list-site \
     --image gcr.io/<project-id>/awesome-list-site:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-env-vars DATABASE_URL=postgresql://user:pass@/awesome_list_site?host=/cloudsql/<project-id>:us-central1:awesome-list-db \
     --add-cloudsql-instances <project-id>:us-central1:awesome-list-db \
     --port 5000 \
     --memory 512Mi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10 \
     --timeout 300
   ```

### Cloud Run Configuration

Configure health checks in Cloud Run:

- **Health check path**: `/health`
- **Check interval**: 30 seconds
- **Timeout**: 10 seconds
- **Healthy threshold**: 2
- **Unhealthy threshold**: 3

### Cloud Run Best Practices

1. **Connection pooling**: Use Cloud SQL Proxy or connection pooling for database connections
2. **Secrets**: Store sensitive data in Secret Manager
3. **Scaling**: Configure min/max instances based on traffic patterns
4. **Cold starts**: Set min-instances to 1 for low-latency requirements
5. **Monitoring**: Enable Cloud Monitoring and Cloud Logging

## Azure Container Apps

Azure Container Apps provides a serverless container platform with integrated scaling and monitoring.

### Prerequisites

- Azure account with active subscription
- Azure CLI installed and configured
- Azure Container Registry (or Docker Hub)

### Deployment Steps

1. **Login to Azure**:
   ```bash
   az login
   ```

2. **Create resource group**:
   ```bash
   az group create --name awesome-list-rg --location eastus
   ```

3. **Create Azure Database for PostgreSQL** (optional):
   ```bash
   az postgres flexible-server create \
     --resource-group awesome-list-rg \
     --name awesome-list-db \
     --location eastus \
     --admin-user postgres \
     --admin-password <your-password> \
     --sku-name Standard_B1ms \
     --tier Burstable \
     --storage-size 32
   ```

4. **Create database**:
   ```bash
   az postgres flexible-server db create \
     --resource-group awesome-list-rg \
     --server-name awesome-list-db \
     --database-name awesome_list_site
   ```

5. **Create Container Apps environment**:
   ```bash
   az containerapp env create \
     --name awesome-list-env \
     --resource-group awesome-list-rg \
     --location eastus
   ```

6. **Build and push to Azure Container Registry**:
   ```bash
   # Create ACR
   az acr create --resource-group awesome-list-rg --name awesomelistreg --sku Basic

   # Login to ACR
   az acr login --name awesomelistreg

   # Build and push
   az acr build --registry awesomelistreg --image awesome-list-site:latest .
   ```

7. **Deploy to Container Apps**:
   ```bash
   az containerapp create \
     --name awesome-list-site \
     --resource-group awesome-list-rg \
     --environment awesome-list-env \
     --image awesomelistreg.azurecr.io/awesome-list-site:latest \
     --target-port 5000 \
     --ingress external \
     --registry-server awesomelistreg.azurecr.io \
     --env-vars \
       NODE_ENV=production \
       DATABASE_URL=postgresql://postgres:<password>@awesome-list-db.postgres.database.azure.com:5432/awesome_list_site?sslmode=require \
     --cpu 0.5 \
     --memory 1.0Gi \
     --min-replicas 0 \
     --max-replicas 10
   ```

8. **Configure health probes**:
   ```bash
   az containerapp update \
     --name awesome-list-site \
     --resource-group awesome-list-rg \
     --set-env-vars HEALTHCHECK_PATH=/health
   ```

### Azure Best Practices

1. **Managed Identity**: Use Azure Managed Identity for accessing Azure resources
2. **Key Vault**: Store secrets in Azure Key Vault
3. **Scaling**: Configure autoscaling rules based on HTTP requests or CPU
4. **Networking**: Use Virtual Network integration for private database access
5. **Monitoring**: Enable Application Insights for performance monitoring

## Replit Deployment

Replit provides the easiest deployment for development and prototyping.

### Prerequisites

- Replit account (free tier available)
- Repository imported to Replit

### Deployment Steps

1. **Import repository**:
   - Go to [replit.com](https://replit.com)
   - Click "Create Repl"
   - Select "Import from GitHub"
   - Enter your repository URL

2. **Configure environment**:
   - Replit auto-detects Node.js
   - Set environment variables in "Secrets" tab:
     ```
     DATABASE_URL=<your-neon-or-postgres-url>
     NODE_ENV=production
     ```

3. **Deploy**:
   - Click "Run" to start the application
   - Use Replit Autoscale for production deployment
   - Application available at `https://<repl-name>.<username>.repl.co`

### Replit Features

- **Auto-detection**: Replit automatically detects `REPL_ID` and enables Replit-specific features
- **OAuth**: Replit OAuth is automatically configured when `REPL_ID` is present
- **Fallback**: Application gracefully falls back to local auth when not on Replit
- **Database**: Use Neon or external PostgreSQL (Replit doesn't provide managed PostgreSQL)

## Database Setup

All deployment platforms require a PostgreSQL database. Here are recommended options:

### Managed Database Options

| Provider | Best For | Free Tier | Pricing |
|----------|----------|-----------|---------|
| **[Neon](https://neon.tech)** | Serverless apps (Vercel, Railway) | 10 GB | From $0/month |
| **[Railway PostgreSQL](https://railway.app)** | Railway deployments | $5/month included | $0.50/GB |
| **[AWS RDS](https://aws.amazon.com/rds/)** | AWS deployments | No | From $15/month |
| **[GCP Cloud SQL](https://cloud.google.com/sql)** | GCP deployments | No | From $10/month |
| **[Azure Database](https://azure.microsoft.com/services/postgresql/)** | Azure deployments | No | From $12/month |
| **[Supabase](https://supabase.com)** | Open-source, full-featured | 500 MB | From $0/month |

### Database Configuration

1. **Create PostgreSQL instance** on your chosen provider

2. **Get connection string**:
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

3. **Set DATABASE_URL** environment variable on your deployment platform

4. **Verify connection**:
   ```bash
   # Test connection locally
   psql "<your-database-url>"

   # Or using Node.js
   node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows); pool.end(); });"
   ```

### Database Migrations

Migrations run automatically on application startup when `NODE_ENV=production`:

- **Automatic**: Migrations execute before the server starts listening
- **Safe**: Application won't start if migrations fail
- **Idempotent**: Safe to run multiple times

To run migrations manually:

```bash
npm run db:push
```

### Connection Pooling

For serverless platforms (Vercel, Cloud Run), use connection pooling:

1. **Neon**: Built-in connection pooling, append `?sslmode=require` to connection string
2. **PgBouncer**: Set up PgBouncer proxy for other databases
3. **Cloud SQL Proxy**: Use Cloud SQL Proxy for GCP deployments

## Environment Variables

All platforms require these environment variables:

### Required Variables

```bash
# Database connection (required)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Environment mode (required for production)
NODE_ENV=production
```

### Optional Variables

```bash
# Server port (auto-detected on most platforms)
PORT=5000

# Content configuration
AWESOME_RAW_URL=https://raw.githubusercontent.com/avelino/awesome-go/main/README.md
GITHUB_REPO_URL=https://github.com/username/awesome-list-site

# Replit-specific (auto-detected on Replit)
REPL_ID=<auto-set-by-replit>
```

### Platform-Specific Notes

- **Vercel**: Set via Vercel dashboard or `vercel env add`
- **Railway**: Set via Railway dashboard or `railway variables set`
- **AWS ECS**: Set in task definition or Secrets Manager
- **GCP Cloud Run**: Set via `--set-env-vars` or Secret Manager
- **Azure**: Set via `--env-vars` or Key Vault
- **Replit**: Set in "Secrets" tab (encrypted)

For detailed documentation of all environment variables, see [ENVIRONMENT.md](./ENVIRONMENT.md).

## Health Checks

All platforms support the `/health` endpoint for monitoring:

### Endpoint

```bash
GET /health
```

### Response

Healthy (200 OK):
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2026-01-31T12:00:00.000Z"
}
```

Unhealthy (503 Service Unavailable):
```json
{
  "status": "degraded",
  "database": "disconnected",
  "version": "1.0.0",
  "timestamp": "2026-01-31T12:00:00.000Z"
}
```

### Platform Configuration

Configure health checks on your platform:

- **Vercel**: Not configurable (automatic)
- **Railway**: `healthcheckPath: /health` in `railway.json`
- **AWS ECS**: Set in task definition's `healthCheck`
- **AWS ALB**: Configure target group health check path
- **GCP Cloud Run**: Automatic via Cloud Run's health checking
- **Azure**: Configure in Container Apps health probes
- **Docker**: Built into Dockerfile `HEALTHCHECK`

## Troubleshooting

### Build Failures

**Error**: `npm install` fails or build errors

**Solution**:
```bash
# Clear npm cache locally
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

**Platform-specific**:
- **Vercel**: Clear build cache in project settings
- **Railway**: Redeploy with "Clear cache and redeploy"
- **AWS**: Rebuild Docker image with `--no-cache`

### Database Connection Errors

**Error**: `Connection refused`, `timeout`, or `authentication failed`

**Solutions**:

1. **Verify DATABASE_URL format**:
   ```bash
   # Correct format
   postgresql://username:password@host:5432/database?sslmode=require

   # Common mistakes
   # ❌ Missing sslmode for managed databases
   # ❌ Wrong port (should be 5432)
   # ❌ URL-encoding special characters in password
   ```

2. **Check firewall/security groups**:
   - AWS: Verify security group allows inbound on port 5432
   - GCP: Check VPC firewall rules
   - Azure: Verify NSG rules allow PostgreSQL connection

3. **Test connection locally**:
   ```bash
   psql "$DATABASE_URL"
   ```

4. **Enable connection pooling** for serverless platforms

### Health Check Failures

**Error**: Container restarts or shows unhealthy

**Solutions**:

1. **Check application logs**:
   ```bash
   # Vercel
   vercel logs

   # Railway
   railway logs

   # AWS ECS
   aws logs tail /ecs/awesome-list-site

   # GCP Cloud Run
   gcloud run services logs read awesome-list-site

   # Azure
   az containerapp logs show --name awesome-list-site --resource-group awesome-list-rg
   ```

2. **Verify health endpoint**:
   ```bash
   curl https://your-app.com/health
   ```

3. **Increase health check timeout**:
   - Database queries may take longer on cold starts
   - Increase timeout to 10-30 seconds
   - Increase start period to 60-90 seconds

### Migration Failures

**Error**: Migrations fail on startup

**Solutions**:

1. **Check DATABASE_URL** is correct and accessible

2. **Run migrations manually**:
   ```bash
   npm run db:push
   ```

3. **Verify migrations folder** exists and contains .sql files

4. **Check database permissions**:
   - User must have CREATE, ALTER, DROP permissions
   - Grant with: `GRANT ALL PRIVILEGES ON DATABASE dbname TO username;`

### Port Binding Issues

**Error**: `EADDRINUSE` or port already in use

**Solution**:

Most platforms set `PORT` automatically. Don't hardcode port 5000:

```typescript
// ✅ Good
const port = process.env.PORT || 5000;

// ❌ Bad
const port = 5000;
```

### Memory Issues

**Error**: Out of memory, container killed

**Solutions**:

1. **Increase memory allocation**:
   - Vercel: Upgrade to Pro for 3GB functions
   - Railway: Increase in service settings
   - AWS ECS: Update task definition memory
   - GCP Cloud Run: Use `--memory 1Gi` or higher
   - Azure: Update `--memory` parameter

2. **Optimize application**:
   - Reduce dependencies
   - Implement connection pooling
   - Add request timeouts

### Environment Variable Issues

**Error**: Variables not loading or undefined

**Solutions**:

1. **Verify variable names** (case-sensitive)

2. **Check platform-specific syntax**:
   - Vercel: No quotes needed
   - Railway: Use Railway dashboard
   - AWS: JSON format in task definition
   - Docker: Use `.env` file or docker-compose

3. **Restart application** after setting variables

4. **Avoid committing .env** to version control

## Platform-Specific Considerations

### Vercel

- **Function timeout**: 10s on Hobby, 60s on Pro
- **Concurrent executions**: Limited on Hobby plan
- **Database**: Use connection pooling (Neon, PgBouncer)
- **Cold starts**: 1-3 seconds on first request
- **Static files**: Served from CDN automatically

### Railway

- **Persistent storage**: Use volumes for file uploads
- **Database**: Built-in PostgreSQL service available
- **Networking**: Private networking between services
- **Scaling**: Horizontal and vertical scaling available
- **Sleep mode**: Apps sleep after inactivity on free tier

### AWS

- **Security groups**: Must allow inbound traffic
- **IAM roles**: Required for ECS tasks to access other AWS services
- **Region selection**: Choose region close to users
- **Cost optimization**: Use Fargate Spot for dev environments
- **Monitoring**: CloudWatch for logs and metrics

### GCP

- **Cold starts**: ~2-5 seconds for Cloud Run
- **Cloud SQL Proxy**: Required for private database connections
- **Billing**: Pay only for request time (not idle time)
- **Regions**: Select region for data residency compliance
- **Service accounts**: Required for accessing other GCP services

### Azure

- **Managed identity**: Simplifies authentication to Azure services
- **VNet integration**: Required for private database access
- **Scaling**: Sophisticated autoscaling rules available
- **Regions**: 60+ regions for global deployment
- **Monitoring**: Application Insights provides deep insights

## Additional Resources

- [Docker Deployment Guide](./DOCKER.md) - Self-hosted deployment with Docker
- [Environment Variables Documentation](./ENVIRONMENT.md) - Complete environment variable reference
- [Database Migration Guide](../scripts/migrate.ts) - Database migration scripts
- [Health Check Implementation](../server/health.ts) - Health check endpoint code

### Platform Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)

### Database Providers

- [Neon Documentation](https://neon.tech/docs)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [GCP Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Azure Database for PostgreSQL Documentation](https://docs.microsoft.com/azure/postgresql/)

---

For local development with Docker, see [DOCKER.md](./DOCKER.md).

For questions or issues, please open a GitHub issue.
