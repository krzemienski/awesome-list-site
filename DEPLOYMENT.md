# Static Site Deployment Guide

This guide covers how to build and deploy the Awesome Video Dashboard as a static site to GitHub Pages.

## Prerequisites

- Node.js 20 or higher
- GitHub repository with Actions enabled
- GitHub Pages enabled in repository settings

## Configuration

### 1. Environment Variables

Set these in your GitHub repository settings under **Settings > Secrets and variables > Actions**:

#### Required Secrets:
- `GA_MEASUREMENT_ID`: Your Google Analytics Measurement ID (e.g., `G-XXXXXXXXXX`)

#### Optional Variables:
- `SITE_TITLE`: Custom site title (default: "Awesome Video Dashboard")
- `SITE_DESCRIPTION`: Custom description (default: "A curated collection of awesome video resources and tools")
- `SITE_URL`: Your GitHub Pages URL (e.g., `https://yourusername.github.io/awesome-dash-video`)
- `DEFAULT_THEME`: Theme color (default: "red")

### 2. Update awesome-list.config.yaml

Ensure your `awesome-list.config.yaml` is properly configured:

```yaml
site:
  title: "Your Awesome Video Dashboard"
  description: "A curated collection of video resources and tools"
  url: "https://yourusername.github.io/awesome-dash-video"
  author: "Your Name"

source:
  url: "https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json"
  refresh_interval: 3600

analytics:
  google_analytics: "G-XXXXXXXXXX"
  events: ["page_view", "resource_click", "search", "filter"]
  anonymize_ip: true
  cookie_consent: false

features:
  search: true
  categories: true
  analytics_dashboard: true
  theme_switcher: true
  ai_tags: false
  pagination: true
  items_per_page: 24
  default_layout: "list"
```

## Local Testing

### Build Static Data
```bash
npm install
tsx scripts/build-static.ts
```

### Build Production Site
```bash
VITE_STATIC_BUILD=true npm run build
```

### Preview Locally
```bash
npm run preview
```

## GitHub Pages Setup

### 1. Enable GitHub Pages
1. Go to repository **Settings > Pages**
2. Set **Source** to "GitHub Actions"
3. Save the configuration

### 2. Configure GitHub Actions
The included `.github/workflows/deploy.yml` will automatically:
- Fetch the latest awesome-video data
- Generate static files
- Build the production site
- Deploy to GitHub Pages

### 3. Set Repository Variables
In **Settings > Secrets and variables > Actions > Variables**:

```
SITE_TITLE=Your Awesome Video Dashboard
SITE_DESCRIPTION=A curated collection of video resources and tools
SITE_URL=https://yourusername.github.io/awesome-dash-video
DEFAULT_THEME=red
```

### 4. Set Repository Secrets
In **Settings > Secrets and variables > Actions > Secrets**:

```
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Deployment Process

1. **Push to main branch** or **manually trigger** the workflow
2. GitHub Actions will:
   - Install dependencies
   - Fetch latest awesome-video data
   - Generate static data files
   - Build the production site
   - Deploy to GitHub Pages
3. Site will be available at `https://yourusername.github.io/awesome-dash-video`

## Build Output

The static build generates:
- `/client/public/data/awesome-list.json` - Pre-fetched resource data
- `/client/public/data/sitemap.json` - Site structure data
- `/dist/` - Production build files

## Troubleshooting

### Build Fails During Data Fetch
- Check if the awesome-video JSON source is accessible
- Verify network connectivity in GitHub Actions

### Missing Environment Variables
- Ensure all required secrets and variables are set in repository settings
- Check spelling and case sensitivity

### GitHub Pages Not Updating
- Verify Pages is set to "GitHub Actions" source
- Check Actions tab for deployment logs
- Ensure repository has Pages enabled

### Analytics Not Working
- Verify `GA_MEASUREMENT_ID` secret is correctly set
- Check Google Analytics property configuration
- Ensure the measurement ID format is correct (G-XXXXXXXXXX)

## Custom Domains

To use a custom domain:
1. Add a `CNAME` file to `/client/public/` with your domain
2. Configure DNS settings with your domain provider
3. Update `SITE_URL` variable to your custom domain
4. Enable HTTPS in GitHub Pages settings

## Performance Optimization

The static build includes:
- Pre-fetched data for instant loading
- Optimized bundle splitting
- Compressed assets
- Efficient caching headers
- SEO-optimized meta tags

## Data Updates

The site automatically fetches fresh data on each deployment. To update data:
1. Push any commit to main branch, or
2. Manually run the "Deploy to GitHub Pages" workflow
3. Data will be refreshed and site redeployed