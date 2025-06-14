# Awesome List Static Site Generator

Transform any GitHub awesome list into a beautiful, SEO-optimized static website with search, categorization, and analytics.

## 🚀 Features

- **Static Site Generation**: Convert awesome lists to fast, SEO-friendly websites
- **Beautiful UI**: Modern dark theme with responsive design
- **Advanced Search**: Filter by categories, tags, and keywords
- **Analytics Ready**: Google Analytics integration
- **GitHub Pages Deployment**: Automated deployment via GitHub Actions
- **Multiple Layouts**: Card, list, and compact views
- **Mobile Optimized**: Fully responsive design

## Quick Start

1. **Fork this repository**
2. **Configure your awesome list** in `awesome-list.config.yaml`:
   ```yaml
   site:
     title: "Your Awesome List"
     description: "A curated list of awesome resources"
   deployment:
     url: "https://yourusername.github.io/awesome-list-site"
   analytics:
     enabled: true
     googleAnalyticsId: "G-XXXXXXXXXX"  # Optional
   ```
3. **Build and test locally**:
   ```bash
   npm install
   npm run dev
   # Visit http://localhost:5001
   ```
4. **Deploy to GitHub Pages**:
   ```bash
   npm run build
   npx tsx scripts/deploy-simple.ts
   ```
5. **Enable GitHub Pages** in repository settings → Pages → Source: GitHub Actions

Your site will be live at: `https://yourusername.github.io/awesome-list-site`

## 📦 Project Structure

```
├── client/           # React frontend application
│   ├── public/      # Static assets and data files
│   └── src/         # React components and logic
├── server/          # Express backend (dev only)
├── scripts/         # Build and deployment scripts
├── docs/            # Documentation
└── awesome-list.config.yaml  # Site configuration
```

## 🛠️ Development

### Local Development Server

```bash
npm install
npm run dev
# Visit http://localhost:5001
```

### Building for Production

```bash
npm run build
# Creates optimized build in dist/
```

### Testing Static Build Locally

```bash
npm run build
cd dist/public
python -m http.server 8080
# Visit http://localhost:8080
```

## 📧 Environment Variables

For AI-powered features (optional), you'll need:
- `ANTHROPIC_API_KEY` - Get from [console.anthropic.com](https://console.anthropic.com)

For analytics (optional):
- `VITE_GA_MEASUREMENT_ID` - From Google Analytics dashboard

## ⚙️ Configuration

Edit `awesome-list.config.yaml` to customize your site. The configuration wizard (`npx tsx scripts/setup-wizard.ts`) will help you set this up interactively.

## 💻 Commands

```bash
# Initial Setup
npm install
npx tsx scripts/setup-wizard.ts    # Interactive configuration

# Development
npm run dev                         # Start dev server (http://localhost:5001)
npm run build                       # Build for production
npm run check                       # TypeScript type checking

# Deployment
npx tsx scripts/deploy-simple.ts    # Deploy to GitHub Pages
```

## 🎯 Deployment

### GitHub Pages (Recommended)

1. Push your code to GitHub
2. Run deployment: `npx tsx scripts/deploy-simple.ts`
3. Enable GitHub Pages: Repository Settings → Pages → Source: GitHub Actions
4. Your site will be live at `https://[username].github.io/[repo-name]`

### GitHub Actions

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages when you push to the main branch.

## 🔧 Troubleshooting

- **Black screen on static site**: Ensure data files exist in `client/public/data/`
- **Port already in use**: The dev server runs on port 5001 by default
- **Build failures**: Run `npm run check` to find TypeScript errors
- **Deployment issues**: Check GitHub Actions logs for specific errors

## 📄 License

MIT - See LICENSE file for details