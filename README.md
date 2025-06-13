# Awesome List Static Site Generator

Transform any GitHub awesome list into a beautiful, SEO-optimized static website with search, categorization, and optional AI enhancements.

## Quick Start

1. **Fork this repository**
2. **Configure your awesome list** in `awesome-list.config.yaml`:
   ```yaml
   site:
     title: "Your Awesome List"
     url: "https://yourusername.github.io/awesome-list-site"
   source:
     url: "https://raw.githubusercontent.com/username/awesome-list/main/README.md"
     format: "markdown"  # or "json" for structured data
   features:
     ai_tags: true       # Requires ANTHROPIC_API_KEY
   ```
3. **Set environment variables** (for AI features):
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-your-key-here"
   ```
4. **Deploy**:
   ```bash
   npx tsx scripts/build-and-deploy.ts
   ```
5. **Enable GitHub Pages** in repository settings → Pages → Source: GitHub Actions

Your site will be live at: `https://yourusername.github.io/awesome-list-site`

## Local Development

```bash
npm install
export ANTHROPIC_API_KEY="sk-ant-your-key-here"  # Optional, for AI features
npm run dev
# Visit http://localhost:5000
```

## Environment Variables

### AI Features (Optional)

For AI-powered tagging and categorization, set your Anthropic API key:

```bash
# Local development
export ANTHROPIC_API_KEY="sk-ant-your-key-here"

# GitHub deployment - add as repository secret
# Settings → Secrets and variables → Actions → New repository secret
# Name: ANTHROPIC_API_KEY
# Value: sk-ant-your-key-here
```

Get your API key from [console.anthropic.com](https://console.anthropic.com). Cost: $0.25-$15/month depending on usage.

### Analytics (Optional)

For Google Analytics tracking:

```bash
# Local development
export VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"

# GitHub deployment - add as repository secret
# Name: GA_MEASUREMENT_ID
# Value: G-XXXXXXXXXX
```

## Configuration

Edit `awesome-list.config.yaml` to configure your site:

```yaml
# Basic configuration
site:
  title: "Your Awesome List"
  description: "Description of your awesome list"
  url: "https://username.github.io/awesome-list-site"
  author: "Your Name"

source:
  url: "https://raw.githubusercontent.com/username/awesome-list/main/README.md"
  format: "markdown"  # or "json"
  refresh_interval: 24

theme:
  default: "red"  # red, blue, green, purple
  primary_color: "#ef4444"

features:
  search: true
  categories: true
  ai_tags: false      # Requires ANTHROPIC_API_KEY
  ai_descriptions: false
  ai_categories: false

analytics:
  google_analytics: "G-XXXXXXXXXX"  # Optional
```

## Commands

```bash
# Development
npm install
npm run dev                           # Start development server

# Deployment  
npx tsx scripts/build-and-deploy.ts  # Interactive deployment
npx tsx scripts/setup-wizard.ts      # Configuration wizard only
```

**Note**: The deployment branch (`gh-pages-build`) is fixed to ensure GitHub Actions workflow compatibility. This prevents deployment issues that would occur if the branch name were changed.

## Troubleshooting

**Configuration errors**: Ensure YAML syntax is correct and all required fields are present

**Data not loading**: Verify the awesome list URL is accessible and points to raw content

**AI features not working**: Set ANTHROPIC_API_KEY environment variable locally

**Build failures**: Check logs for specific errors and ensure all dependencies are installed