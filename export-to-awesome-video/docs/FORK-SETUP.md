# Fork Setup Guide

This guide helps you fork and customize the Awesome Video Dashboard for your own awesome list.

## Quick Fork Setup

### 1. Fork the Repository
1. Click "Fork" on the GitHub repository page
2. Choose your GitHub account/organization
3. Optionally rename the repository (e.g., `awesome-python-dashboard`)

### 2. Configure for Your Awesome List

Edit `awesome-list.config.yaml` with your list details:

```yaml
site:
  title: "Your Awesome List Dashboard"
  description: "A curated collection of your awesome resources"
  url: "https://yourusername.github.io/your-repo-name"
  author: "Your Name"

source:
  url: "https://raw.githubusercontent.com/username/awesome-list/master/README.md"
  refresh_interval: 3600

analytics:
  google_analytics: "G-XXXXXXXXXX"  # Your GA measurement ID
  events: ["page_view", "resource_click", "search", "filter"]
  anonymize_ip: true
  cookie_consent: false

theme:
  default: "blue"  # red, blue, green, purple, orange, yellow
  primary_color: "#3b82f6"

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

### 3. Update Data Source

**For Standard Awesome Lists (Markdown):**
No code changes needed - just update the `source.url` in config.yaml

**For JSON-based Lists:**
1. Create a parser in `server/` directory following the pattern in `awesome-video-parser.ts`
2. Update `server/routes.ts` to use your parser
3. Modify `scripts/build-static.ts` to call your parser

### 4. GitHub Pages Setup

**Enable GitHub Pages:**
1. Go to repository Settings > Pages
2. Set Source to "GitHub Actions"
3. Save configuration

**Set Repository Variables:**
In Settings > Secrets and variables > Actions > Variables:
```
SITE_TITLE=Your Awesome List Dashboard
SITE_DESCRIPTION=Your custom description
SITE_URL=https://yourusername.github.io/your-repo-name
DEFAULT_THEME=blue
```

**Set Repository Secrets:**
In Settings > Secrets and variables > Actions > Secrets:
```
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 5. Deploy
1. Push changes to main branch
2. GitHub Actions will automatically build and deploy
3. Site available at your GitHub Pages URL

## Customization Options

### Theme Colors
Available themes: `red`, `blue`, `green`, `purple`, `orange`, `yellow`

### Custom Parsing
For non-standard awesome lists, create a custom parser:

```typescript
// server/your-awesome-parser.ts
export async function fetchYourAwesomeList(): Promise<AwesomeListData> {
  // Your custom parsing logic
  const response = await fetch('your-data-source');
  const data = await response.json();
  
  return {
    title: "Your List Title",
    description: "Your list description",
    repoUrl: "https://github.com/user/repo",
    resources: parsedResources
  };
}
```

### Analytics Customization
Add custom tracking events in `client/src/lib/analytics.ts`

### UI Customization
- Modify components in `client/src/components/`
- Update styles in `client/src/index.css`
- Customize layout in `client/src/components/layout/`

## Supported Data Sources

### Markdown Awesome Lists
- Standard GitHub awesome list format
- Categories defined by H2/H3 headers
- Resources as markdown links

### JSON Data Sources
- Custom JSON APIs
- Static JSON files
- Structured data formats

### Adding New Sources
1. Create parser in `server/` directory
2. Implement `AwesomeListData` interface
3. Update build scripts
4. Test locally before deploying

## Development Workflow

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

### Deploy to GitHub Pages
```bash
git push origin main
```

## Common Customizations

### 1. Change Data Source
Update `awesome-list.config.yaml`:
```yaml
source:
  url: "https://raw.githubusercontent.com/your-user/your-awesome-list/master/README.md"
```

### 2. Custom Domain
1. Add `CNAME` file to `client/public/` with your domain
2. Configure DNS with your provider
3. Update `SITE_URL` in repository variables

### 3. Different Theme
Update `awesome-list.config.yaml`:
```yaml
theme:
  default: "green"
  primary_color: "#10b981"
```

### 4. Disable Features
```yaml
features:
  search: false
  analytics_dashboard: false
  theme_switcher: false
```

### 5. Custom Categories
For non-standard category structures, modify the parser to map your data to the expected format.

## Troubleshooting

### Build Failures
- Check data source accessibility
- Verify config.yaml syntax
- Review GitHub Actions logs

### Missing Data
- Ensure parser matches your data format
- Check network connectivity to data source
- Verify file paths in configuration

### Styling Issues
- Clear browser cache
- Check CSS variable definitions
- Verify theme configuration

## Support

For issues specific to this dashboard:
1. Check existing GitHub Issues
2. Review deployment logs
3. Test with provided example configuration

For awesome list format questions:
- Refer to [awesome list guidelines](https://github.com/sindresorhus/awesome)
- Check the original awesome list repository