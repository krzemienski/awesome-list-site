# Awesome Video Site

A modern, fast static site that showcases the curated awesome-video collection with powerful search and filtering capabilities.

## Overview

This project transforms the [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video) repository into an interactive web experience, deployed automatically to GitHub Pages at [krzemienski.github.io/awesome-list-site](https://krzemienski.github.io/awesome-list-site).

## Features

- **Authentic Data**: Fetches real-time data from awesome-video repository (2011+ resources)
- **Advanced Search**: Real-time search across titles, descriptions, and categories
- **Smart Filtering**: Dynamic category filtering with visual feedback
- **Modern Design**: Dark theme with responsive design optimized for all devices
- **Analytics Integration**: Google Analytics tracking for user engagement
- **Zero Maintenance**: Automated deployment with no manual builds required

## Live Site

Visit the deployed site: **https://krzemienski.github.io/awesome-list-site**

## Deployment Architecture

The site uses a streamlined GitHub Actions workflow that:

1. **Fetches** latest data from awesome-video repository JSON source
2. **Processes** 2011+ video resources into optimized format
3. **Generates** a static site with embedded search and filtering
4. **Deploys** automatically to GitHub Pages

### Deployment Workflow

The single deployment workflow (`.github/workflows/deploy-clean.yml`) handles everything:

```yaml
# Triggers on push to main branch or manual dispatch
on:
  push:
    branches: [ main ]
  workflow_dispatch:

# Processes authentic data and deploys static site
jobs:
  build:
    - Fetch awesome-video JSON data
    - Transform into site format
    - Generate static HTML with embedded functionality
    - Deploy to GitHub Pages
```

## Local Development

For local development and testing:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5000
```

The development server fetches live data from the awesome-video repository and provides the same functionality as the deployed site.

## Configuration

Site configuration is managed in `awesome-list.config.yaml`:

```yaml
site:
  title: "Awesome Video"
  description: "A curated list of awesome video tools and resources"
  url: "https://krzemienski.github.io/awesome-list-site"

source:
  url: "https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json"
  format: "json"

analytics:
  google_analytics: "G-383541848"

theme:
  default: "dark"
  primary_color: "#dc2626"
```

## Project Structure

```
├── .github/workflows/
│   └── deploy-clean.yml     # Single deployment workflow
├── client/                  # Development environment
├── awesome-list.config.yaml # Site configuration
├── README.md               # This file
└── replit.md              # Project documentation
```

## Data Flow

1. **Source**: awesome-video repository (JSON format, 2011+ resources)
2. **Processing**: GitHub Actions transforms data into site format
3. **Generation**: Static HTML created with embedded search/filter functionality
4. **Deployment**: Automatic deployment to GitHub Pages
5. **Analytics**: Google Analytics tracks user interactions

## Key Technologies

- **Static Site Generation**: No complex build dependencies
- **GitHub Actions**: Automated deployment pipeline
- **Authentic Data**: Real-time fetching from source repository
- **Modern JavaScript**: Vanilla JS with optimized performance
- **Responsive Design**: Mobile-first CSS with dark theme

## Maintenance

The site requires zero maintenance:
- Data updates automatically when awesome-video repository changes
- Deployment triggers on any push to main branch
- No local builds or manual deployments needed
- Analytics provide insights into usage patterns

## Contributing

To modify the site:

1. Update configuration in `awesome-list.config.yaml`
2. Modify deployment workflow if needed
3. Push changes to main branch
4. GitHub Actions handles the rest

## Analytics

The site includes Google Analytics (G-383541848) tracking:
- Resource views and clicks
- Search queries and patterns
- Category filter usage
- Performance metrics

## Support

- Source data: [awesome-video repository](https://github.com/krzemienski/awesome-video)
- Live site: [krzemienski.github.io/awesome-list-site](https://krzemienski.github.io/awesome-list-site)
- Issues: Create GitHub issues for bugs or feature requests