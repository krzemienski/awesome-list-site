# Awesome Video Dashboard

A modern, interactive web application that transforms the [awesome-video](https://github.com/krzemienski/awesome-video) curated list into a searchable, filterable dashboard with advanced analytics and mobile-optimized design.

## Features

- **2,011+ Video Resources** - Comprehensive collection of video tools, libraries, and technologies
- **Advanced Search & Filtering** - Find resources by name, category, or description
- **Mobile-Optimized Design** - Touch-friendly interface with popover interactions
- **Dark Theme Interface** - Professional red-accented dark theme
- **Real-time Analytics** - Google Analytics integration with detailed user behavior tracking
- **Static Site Generation** - Fast loading with pre-generated data
- **Responsive Categories** - Organized by video processing, streaming, codecs, and more
- **Keyboard Shortcuts** - Quick navigation with `/` for search, `Ctrl+K` shortcuts

## Live Demo

Visit the live dashboard: [https://krzemienski.github.io/awesome-video](https://krzemienski.github.io/awesome-video)

## Quick Start

### For Repository Owner

1. **Configure Repository Settings**:
   - Go to Settings > Pages > Set source to "GitHub Actions"
   - Add repository variables and secrets (see [REPOSITORY-CONFIG.md](REPOSITORY-CONFIG.md))

2. **Deploy**:
   ```bash
   git push origin main
   ```
   GitHub Actions will automatically build and deploy to GitHub Pages.

### For Fork Users

See [FORK-SETUP.md](FORK-SETUP.md) for complete instructions on customizing this dashboard for your own awesome list.

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Shadcn/ui
- **Build System**: Vite, ESBuild
- **Deployment**: GitHub Actions, GitHub Pages
- **Analytics**: Google Analytics 4
- **Data Source**: awesome-video JSON API

## Development

### Local Development
```bash
npm install
npm run dev
```

### Static Build Testing
```bash
tsx scripts/build-static.ts
VITE_STATIC_BUILD=true npm run build
npm run preview
```

### Test Deployment System
```bash
tsx scripts/test-deployment.ts
```

## Configuration

The dashboard is configured via `awesome-list.config.yaml`:

```yaml
site:
  title: "Awesome Video Dashboard"
  description: "A curated collection of awesome video resources"
  url: "https://krzemienski.github.io/awesome-video"

source:
  url: "https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json"
  refresh_interval: 3600

features:
  search: true
  categories: true
  analytics_dashboard: true
  pagination: true
  items_per_page: 24
```

## Analytics Tracking

Comprehensive analytics implementation tracks:
- Page views and user sessions
- Search queries and filter usage
- Resource clicks and category navigation
- Mobile interactions and touch events
- Performance metrics and Core Web Vitals
- Error tracking and API response times

## Deployment

### Automatic Deployment
- Pushes to main branch trigger GitHub Actions
- Fresh data fetched from awesome-video source
- Static site generated and deployed to GitHub Pages
- Typically completes in 3-5 minutes

### Manual Deployment
- Go to Actions tab in GitHub repository
- Run "Deploy to GitHub Pages" workflow manually

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [FORK-SETUP.md](FORK-SETUP.md) - Fork and customization instructions
- [REPOSITORY-CONFIG.md](REPOSITORY-CONFIG.md) - Repository-specific configuration

## Data Source

This dashboard uses the [awesome-video](https://github.com/krzemienski/awesome-video) curated list, which contains video-related tools and resources organized by:

- Video Processing Libraries
- Streaming Technologies
- Codecs and Formats
- Players and Frameworks
- APIs and Services
- Learning Resources

Data is automatically refreshed on each deployment to ensure the latest resources are always available.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `tsx scripts/test-deployment.ts`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [awesome-video](https://github.com/krzemienski/awesome-video) - Data source and curation
- [Sindre Sorhus](https://github.com/sindresorhus/awesome) - Awesome list format
- Shadcn/ui and Radix UI - Component libraries