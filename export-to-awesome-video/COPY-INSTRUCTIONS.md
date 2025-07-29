# Copy Instructions for awesome-video Repository

## Quick Setup Guide

1. **Copy all files** from this export folder to your `krzemienski/awesome-video` repository
2. **Maintain directory structure** exactly as shown below
3. **Set repository configuration** as specified
4. **Push and deploy**

## File Structure to Copy

```
awesome-video/
├── .github/workflows/deploy.yml          # GitHub Actions deployment
├── scripts/
│   ├── build-static.ts                   # Static data generation
│   └── test-deployment.ts                # Deployment verification
├── client/src/
│   ├── lib/
│   │   ├── static-data.ts                # Static data loader
│   │   └── analytics.ts                  # Google Analytics integration
│   └── hooks/
│       ├── use-analytics.tsx             # Page view tracking
│       └── use-session-analytics.tsx     # Session metrics
├── awesome-list.config.yaml              # Site configuration
└── README.md                             # Updated documentation
```

## Repository Configuration

### GitHub Pages
- Settings > Pages > Source: "GitHub Actions"

### Variables (Settings > Secrets and variables > Actions > Variables)
```
SITE_TITLE=Awesome Video Dashboard
SITE_DESCRIPTION=A curated collection of awesome video resources, tools, and technologies for developers and content creators
SITE_URL=https://krzemienski.github.io/awesome-video
DEFAULT_THEME=red
```

### Secrets (Settings > Secrets and variables > Actions > Secrets)
```
GA_MEASUREMENT_ID=G-383541848
```

## Deployment Commands

```bash
git add .
git commit -m "Add static site deployment system with comprehensive analytics"
git tag -a AwesomeVideoDeployment -m "Complete deployment system"
git push origin main
git push origin AwesomeVideoDeployment
```

## Expected Result

Site deploys automatically to: `https://krzemienski.github.io/awesome-video`

Features:
- 2,011 video resources from awesome-video JSON
- Mobile-optimized interface with search and filtering
- Google Analytics tracking with comprehensive user behavior analytics
- Dark theme with red accents
- Static site generation for fast loading