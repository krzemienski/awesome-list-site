# Deployment Checklist

**Version**: 2.0.0
**Last Updated**: 2025-11-29
**Platform**: Docker + Supabase Cloud

---

## Overview

This comprehensive checklist ensures a smooth deployment of the Awesome Video Resources platform. Follow each phase sequentially to avoid issues.

**Total Estimated Time**: 8-12 hours (first deployment)
**Prerequisites**: Docker, Supabase account, domain name, SSL certificates

---

## Phase 1: Pre-Deployment Preparation

### 1.1 Environment Setup

- [ ] **Create Supabase Project**
  - Navigate to https://supabase.com/dashboard
  - Click "New Project"
  - Name: `awesome-video-production`
  - Database password: Generate strong password (save to password manager)
  - Region: Choose closest to users
  - Plan: Free tier or Pro (recommended for production)

- [ ] **Save Supabase Credentials**
  ```bash
  # From Project Settings → API
  SUPABASE_URL=https://[PROJECT_REF].supabase.co
  SUPABASE_ANON_KEY=eyJhbGci...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # ⚠️ Keep secret!

  # From Project Settings → Database → Connection String
  DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  ```

- [ ] **Clone Repository**
  ```bash
  git clone https://github.com/yourusername/awesome-list-site.git
  cd awesome-list-site
  ```

- [ ] **Install Dependencies**
  ```bash
  npm install
  ```

### 1.2 API Keys & Secrets

- [ ] **Anthropic API Key** (Required for AI features)
  - Sign up at https://console.anthropic.com
  - Create API key with billing enabled
  - Save to `.env`: `ANTHROPIC_API_KEY=sk-ant-api03-...`

- [ ] **GitHub Personal Access Token** (Required for sync)
  - Navigate to https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Scopes: `repo` (full control of private repositories)
  - Save to `.env`: `GITHUB_TOKEN=ghp_...`

- [ ] **Google Analytics** (Optional)
  - Create GA4 property at https://analytics.google.com
  - Save measurement ID to `client/.env.local`: `VITE_GA_MEASUREMENT_ID=G-...`

### 1.3 Domain & SSL

- [ ] **Domain Configuration**
  - Register domain or use existing
  - Point A record to server IP: `@ → SERVER_IP`
  - Point CNAME for www: `www → yourdomain.com`
  - Verify DNS propagation: `nslookup yourdomain.com`

- [ ] **SSL Certificate** (Let's Encrypt recommended)
  ```bash
  # On Ubuntu server
  sudo apt install certbot
  sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

  # Certificates saved to:
  # /etc/letsencrypt/live/yourdomain.com/fullchain.pem
  # /etc/letsencrypt/live/yourdomain.com/privkey.pem
  ```

- [ ] **Copy SSL to Docker**
  ```bash
  sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
  sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
  ```

---

## Phase 2: Database Setup

### 2.1 Apply Migrations

- [ ] **Run Migrations via Supabase Dashboard**
  1. Open Supabase SQL Editor
  2. Copy contents of `supabase/migrations/20250101000000_initial_schema.sql`
  3. Execute SQL
  4. Verify tables created: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`

- [ ] **OR Use Supabase CLI**
  ```bash
  npm install -g supabase
  supabase login
  supabase link --project-ref [PROJECT_REF]
  supabase db push
  ```

### 2.2 Configure Row-Level Security

- [ ] **Enable RLS on All Tables**
  ```sql
  -- In Supabase SQL Editor
  ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
  -- ... (see migration file for complete list)
  ```

- [ ] **Verify Policies Exist**
  ```sql
  SELECT schemaname, tablename, policyname
  FROM pg_policies
  WHERE schemaname = 'public';
  ```

### 2.3 Seed Database

- [ ] **Option A: Import from CSV**
  ```bash
  # If you have existing data
  psql $DATABASE_URL < docs/migration/resources_export.sql
  ```

- [ ] **Option B: Seed via API** (after deployment)
  ```bash
  curl -X POST https://yourdomain.com/api/admin/seed-database \
    -H "Authorization: Bearer ${ADMIN_JWT}" \
    -H "Content-Type: application/json" \
    -d '{"clearExisting": false}'
  ```

- [ ] **Verify Data**
  ```sql
  SELECT COUNT(*) FROM resources;  -- Should be 2,644+
  SELECT COUNT(*) FROM categories;  -- Should be 9
  ```

---

## Phase 3: Authentication Setup

### 3.1 Create First Admin User

- [ ] **Sign Up via Supabase Dashboard**
  1. Navigate to Authentication → Users
  2. Click "Add user" → "Create new user"
  3. Email: `admin@yourdomain.com`
  4. Password: Generate strong password
  5. Email confirmation: Off (for first admin)

- [ ] **Promote to Admin**
  ```sql
  -- In Supabase SQL Editor
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE email = 'admin@yourdomain.com';
  ```

- [ ] **Verify Admin Status**
  ```sql
  SELECT email, raw_user_meta_data->>'role' as role
  FROM auth.users
  WHERE email = 'admin@yourdomain.com';
  -- Should return: admin@yourdomain.com | admin
  ```

### 3.2 Configure OAuth Providers

**GitHub OAuth**:
- [ ] Create OAuth App at https://github.com/settings/developers
  - Application name: `Awesome Video Resources`
  - Homepage URL: `https://yourdomain.com`
  - Authorization callback URL: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
- [ ] Save Client ID and Client Secret
- [ ] Add to Supabase: Authentication → Providers → GitHub
  - Enable GitHub provider
  - Paste Client ID and Secret
  - Click "Save"

**Google OAuth**:
- [ ] Create OAuth Client at https://console.cloud.google.com/apis/credentials
  - Application type: Web application
  - Authorized redirect URIs: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
- [ ] Save Client ID and Client Secret
- [ ] Add to Supabase: Authentication → Providers → Google
  - Enable Google provider
  - Paste Client ID and Secret
  - Click "Save"

**Email/Password**:
- [ ] Enable in Supabase: Authentication → Providers → Email
  - Enable email provider
  - Confirm email required: Yes (recommended)
  - Secure email change required: Yes

### 3.3 Configure Email Templates

- [ ] **Customize Auth Emails** (Supabase Dashboard → Authentication → Email Templates)
  - Confirmation email
  - Magic link email
  - Password reset email
  - Update from address: `noreply@yourdomain.com`

---

## Phase 4: Environment Configuration

### 4.1 Backend Environment Variables

- [ ] **Create `.env.production`**
  ```bash
  # Supabase
  SUPABASE_URL=https://[PROJECT_REF].supabase.co
  SUPABASE_ANON_KEY=eyJhbGci...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
  DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

  # Redis
  REDIS_URL=redis://redis:6379

  # GitHub
  GITHUB_TOKEN=ghp_...

  # AI
  ANTHROPIC_API_KEY=sk-ant-api03-...
  AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...

  # App
  NODE_ENV=production
  PORT=3000
  WEBSITE_URL=https://yourdomain.com

  # Session
  SESSION_SECRET=$(openssl rand -base64 32)
  ```

### 4.2 Frontend Environment Variables

- [ ] **Create `client/.env.production`**
  ```bash
  VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGci...
  VITE_GA_MEASUREMENT_ID=G-...  # Optional
  ```

### 4.3 Verify Environment Variables

- [ ] **Check all required vars set**
  ```bash
  # Run verification script
  node scripts/verify-env.js
  ```

- [ ] **Test Database Connection**
  ```bash
  npm run db:test
  # Expected: Connection successful ✅
  ```

---

## Phase 5: Docker Build & Test

### 5.1 Build Docker Images

- [ ] **Build Production Images**
  ```bash
  docker-compose -f docker-compose.yml --env-file .env.production build
  ```

- [ ] **Verify Image Sizes**
  ```bash
  docker images | grep awesome-list
  # Expected: ~500MB for web image
  ```

### 5.2 Local Testing

- [ ] **Start Services Locally**
  ```bash
  docker-compose -f docker-compose.yml --env-file .env.production up -d
  ```

- [ ] **Check Health**
  ```bash
  curl http://localhost:3000/api/health
  # Expected: {"status":"ok"}
  ```

- [ ] **Test Frontend**
  - Open http://localhost:3000
  - Verify homepage loads
  - Check resources appear
  - Test theme toggle
  - Test search

- [ ] **Test Authentication**
  - Sign up new user
  - Verify email confirmation
  - Login with email/password
  - Test GitHub OAuth
  - Test Google OAuth
  - Test logout

- [ ] **Test Admin Panel** (login as admin)
  - Access /admin
  - View dashboard stats
  - Approve/reject resource
  - Run enrichment job
  - Export data

- [ ] **Stop Local Services**
  ```bash
  docker-compose down
  ```

---

## Phase 6: Production Deployment

### 6.1 Server Setup

- [ ] **Provision Server**
  - Provider: DigitalOcean, AWS, GCP, or other
  - OS: Ubuntu 22.04 LTS
  - RAM: 2GB minimum, 4GB recommended
  - Storage: 20GB SSD
  - Firewall: Allow ports 22, 80, 443

- [ ] **Install Docker**
  ```bash
  # On Ubuntu server
  sudo apt update
  sudo apt install -y docker.io docker-compose
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  ```

- [ ] **Clone Repository on Server**
  ```bash
  git clone https://github.com/yourusername/awesome-list-site.git
  cd awesome-list-site
  ```

### 6.2 Deploy Application

- [ ] **Copy Environment Files**
  ```bash
  scp .env.production user@server:/path/to/awesome-list-site/.env
  scp client/.env.production user@server:/path/to/awesome-list-site/client/.env.local
  ```

- [ ] **Copy SSL Certificates**
  ```bash
  scp -r docker/nginx/ssl user@server:/path/to/awesome-list-site/docker/nginx/ssl
  ```

- [ ] **Update Nginx Configuration**
  ```bash
  # Edit docker/nginx/nginx.conf
  # Replace localhost with yourdomain.com
  nano docker/nginx/nginx.conf
  ```

- [ ] **Start Production Services**
  ```bash
  docker-compose -f docker-compose.yml --env-file .env up -d --build
  ```

- [ ] **Verify Services Running**
  ```bash
  docker-compose ps
  # Expected: web, redis running
  ```

### 6.3 Domain Configuration

- [ ] **Update DNS** (if not done earlier)
  - A record: `yourdomain.com → SERVER_IP`
  - CNAME: `www → yourdomain.com`

- [ ] **Test HTTPS**
  ```bash
  curl -I https://yourdomain.com
  # Expected: HTTP/2 200
  ```

---

## Phase 7: Post-Deployment Verification

### 7.1 Functional Testing

- [ ] **Homepage**
  - ✅ Loads in < 3 seconds
  - ✅ Shows resource count
  - ✅ Categories visible
  - ✅ Search works

- [ ] **Authentication**
  - ✅ Email/password signup works
  - ✅ Email confirmation received
  - ✅ GitHub OAuth works
  - ✅ Google OAuth works
  - ✅ Logout works

- [ ] **Resource Browsing**
  - ✅ Category pages load
  - ✅ Resource cards display correctly
  - ✅ Favorites work (when logged in)
  - ✅ Bookmarks work (when logged in)

- [ ] **Admin Panel**
  - ✅ Accessible at /admin
  - ✅ Dashboard stats accurate
  - ✅ Can approve/reject resources
  - ✅ AI enrichment works
  - ✅ GitHub sync works

### 7.2 Performance Testing

- [ ] **Lighthouse Audit**
  - Performance: > 90
  - Accessibility: > 95
  - Best Practices: > 90
  - SEO: > 95

- [ ] **API Response Times**
  ```bash
  # Test API speed
  curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/api/resources
  # Expected: < 200ms
  ```

- [ ] **Database Query Performance**
  - Check Supabase dashboard → Logs
  - Average query time: < 50ms
  - No slow queries (> 1s)

### 7.3 Security Verification

- [ ] **SSL Configuration**
  - Test at https://www.ssllabs.com/ssltest/
  - Grade: A or A+

- [ ] **Security Headers**
  - Test at https://securityheaders.com
  - Grade: A or higher

- [ ] **CORS Configuration**
  ```bash
  curl -I -X OPTIONS https://yourdomain.com/api/health
  # Verify CORS headers present
  ```

- [ ] **RLS Policies**
  ```sql
  -- Test as anonymous user
  SET ROLE anon;
  SELECT * FROM resources WHERE status = 'pending';
  -- Expected: 0 rows (RLS blocks pending resources)
  ```

---

## Phase 8: Monitoring & Maintenance

### 8.1 Setup Monitoring

- [ ] **Uptime Monitoring**
  - Service: UptimeRobot, Pingdom, or StatusPage
  - Monitor: https://yourdomain.com
  - Alert: Email, SMS, Slack

- [ ] **Error Tracking**
  - Service: Sentry, LogRocket, or Rollbar
  - Install client: `npm install @sentry/react`
  - Configure DSN in `.env`

- [ ] **Log Aggregation**
  ```bash
  # Setup log rotation
  sudo nano /etc/logrotate.d/docker-awesome-list
  # Add rotation rules
  ```

### 8.2 Backup Strategy

- [ ] **Database Backups** (Supabase automatic)
  - Daily backups enabled
  - Retention: 7 days (Free), 30 days (Pro)

- [ ] **Manual Backup**
  ```bash
  # Backup database
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

  # Backup environment
  tar -czf env-backup-$(date +%Y%m%d).tar.gz .env client/.env.local
  ```

- [ ] **Backup Schedule**
  - Daily: Automatic via Supabase
  - Weekly: Manual export to CSV
  - Monthly: Full system backup

### 8.3 Monitoring Dashboard

- [ ] **Create Admin Dashboard Alerts**
  - Pending resources > 50
  - Failed enrichment jobs
  - Broken links detected
  - Low disk space

- [ ] **Setup Analytics**
  - Google Analytics 4 dashboard
  - Supabase Analytics
  - Custom reports

---

## Phase 9: Documentation & Handoff

### 9.1 Update Documentation

- [ ] **Update README.md**
  - Add production URL
  - Update deployment instructions
  - Add badges (build status, license)

- [ ] **Create CHANGELOG.md**
  - Document all changes since last version
  - Follow semantic versioning

- [ ] **Update Admin Manual**
  - Production-specific instructions
  - Contact information
  - Support channels

### 9.2 Team Training

- [ ] **Admin Training Session**
  - How to access admin panel
  - Resource approval process
  - AI enrichment workflow
  - GitHub sync process

- [ ] **Support Documentation**
  - FAQ for common issues
  - Troubleshooting guide
  - Escalation process

### 9.3 Handoff Checklist

- [ ] **Provide Access**
  - Supabase dashboard access
  - Server SSH access
  - Domain registrar access
  - GitHub repository access

- [ ] **Share Credentials** (via password manager)
  - Admin account
  - Supabase credentials
  - API keys (Anthropic, GitHub)
  - SSL certificates location

- [ ] **Document Runbooks**
  - Deployment process
  - Rollback procedure
  - Scaling guide
  - Disaster recovery

---

## Phase 10: Post-Launch

### 10.1 First 24 Hours

- [ ] **Monitor Logs**
  ```bash
  docker-compose logs -f web
  ```

- [ ] **Check Error Rates**
  - Supabase dashboard → Logs
  - Sentry dashboard (if configured)

- [ ] **User Feedback**
  - Monitor support channels
  - Check analytics for unusual patterns

### 10.2 First Week

- [ ] **Performance Optimization**
  - Review slow queries
  - Optimize images
  - Enable CDN (if needed)

- [ ] **Security Audit**
  - Review access logs
  - Check for unusual activity
  - Update dependencies

### 10.3 First Month

- [ ] **Quarterly Review**
  - User growth trends
  - Resource quality metrics
  - Cost analysis
  - Feature requests

- [ ] **Scaling Plan**
  - Upgrade Supabase plan if needed
  - Add Redis persistence
  - Implement CDN
  - Setup load balancer

---

## Rollback Plan

### Emergency Rollback

If deployment fails critically:

1. **Stop Services**
   ```bash
   docker-compose down
   ```

2. **Restore Previous Version**
   ```bash
   git checkout [PREVIOUS_TAG]
   docker-compose up -d
   ```

3. **Restore Database** (if needed)
   ```bash
   psql $DATABASE_URL < backup-YYYYMMDD.sql
   ```

4. **Verify Rollback**
   - Test homepage
   - Test authentication
   - Check admin panel

---

## Checklist Summary

**Pre-Deployment**: 15 tasks
**Database Setup**: 8 tasks
**Authentication**: 12 tasks
**Environment Config**: 5 tasks
**Docker Build**: 11 tasks
**Production Deploy**: 10 tasks
**Post-Deploy Verify**: 15 tasks
**Monitoring**: 10 tasks
**Documentation**: 8 tasks
**Post-Launch**: 9 tasks

**Total**: 103 tasks

---

**Deployment Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete
**Last Deployed**: YYYY-MM-DD
**Deployed By**: Your Name
**Version**: 2.0.0
