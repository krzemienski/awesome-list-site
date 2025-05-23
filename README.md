# Awesome List Static Site Generator

Transform any GitHub "Awesome-List" into a beautiful, searchable, and mobile-optimized website with enhanced user experience and discovery features.

## 🌟 What This Does

This tool converts GitHub Awesome-List README.md files into dynamic, SEO-friendly websites featuring:

- **📱 Mobile-first responsive design** - Perfect experience on all devices
- **🔍 Advanced search & filtering** - Find resources by title, description, category
- **🎨 Custom themes** - Dark/light mode + custom theme editor
- **📊 Analytics dashboard** - Track resource popularity and usage patterns
- **🚀 Multi-list support** - Switch between different awesome lists
- **⚡ Fast loading** - Optimized performance with animated skeletons
- **🔗 Rich previews** - Interactive hover cards with GitHub stats
- **♿ SEO optimized** - Proper meta tags and structured data

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Node.js + Express + TypeScript  
- **Parser**: Remark-based markdown parser that understands awesome-list format
- **Storage**: In-memory storage (no database required for simplicity)
- **Build**: Vite for development and production builds

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd awesome-list-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your awesome list** (Optional)
   
   Set the `AWESOME_RAW_URL` environment variable to point to your awesome list:
   ```bash
   export AWESOME_RAW_URL="https://raw.githubusercontent.com/your-org/your-awesome-list/main/README.md"
   ```
   
   Default: `https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md`

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The site will be available at `http://localhost:5000`

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 📝 Supported Awesome List Formats

The parser automatically handles standard awesome-list markdown formats:

### Basic Resource Entry
```markdown
- [Resource Name](https://example.com) - Description of the resource. `License` `Language/Platform`
```

### With Additional Links
```markdown
- [Resource Name](https://example.com) - Description. ([Demo](https://demo.com), [Source Code](https://github.com/user/repo)) `MIT` `JavaScript`
```

### Category Structure
```markdown
## Main Category

### Subcategory (Optional)

- [Resource 1](https://example.com) - Description.
- [Resource 2](https://example.com) - Another description.
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server (both frontend and backend)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run preview` - Preview production build locally

## 🎨 Customization

### Environment Variables

- `AWESOME_RAW_URL` - URL to the raw markdown file of your awesome list
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

### Themes

The application includes:
- **Light/Dark mode toggle** - Automatic system preference detection
- **Custom theme editor** - Create and save your own color schemes
- **Pre-built themes** - Several beautiful themes included
- **Theme persistence** - Themes saved to localStorage

### Adding New Lists

The multi-list switcher supports switching between different awesome lists. To add new lists:

1. Update the `predefinedLists` array in `client/src/components/ui/list-switcher.tsx`
2. Add the raw GitHub URL and metadata for your list
3. The parser will automatically handle different markdown formats

## 🔧 Advanced Configuration

### Custom Parser Rules

To modify how resources are parsed, edit `server/parser.ts`:

- `extractMetadata()` - Customize license/language extraction
- `parseListItems()` - Modify resource parsing logic
- `parseMarkdown()` - Adjust category/subcategory handling

### Styling

The design system uses:
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **CSS Variables** - Easy theme customization
- **Dark mode** - Built-in dark/light mode support

Custom styles can be added in `client/src/index.css`.

## 📊 Analytics Features

The built-in analytics dashboard provides:
- **Resource popularity** - Most viewed and trending resources
- **Category distribution** - Visual breakdown of categories
- **Search trends** - Popular search terms and patterns
- **Usage patterns** - Time-based usage analytics
- **Performance metrics** - Loading times and user engagement

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for help and ideas
- **Documentation**: This README and inline code comments

## 🌍 Examples

### Live Examples

- [Awesome Self-Hosted](https://your-domain.com) - Default configuration
- [Awesome Go](https://your-domain.com) - Go programming resources
- [Awesome Python](https://your-domain.com) - Python ecosystem tools

### Custom Deployments

This generator works with any properly formatted awesome list. Popular formats include:

- **Awesome-\*** lists from the [Awesome](https://github.com/sindresorhus/awesome) ecosystem
- **Curated-\*** lists following similar markdown patterns
- **Custom resource lists** using the supported markdown format

## 🚀 Deployment Options

### Replit (Recommended for beginners)
1. Import this repository to Replit
2. Set environment variables in Replit Secrets
3. Click "Deploy" to publish your site

### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in project settings
3. Deploy automatically on every push

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Traditional VPS
1. Clone repository on your server
2. Install dependencies with `npm ci`
3. Build with `npm run build`
4. Use PM2 or similar for process management
5. Set up reverse proxy (nginx/Apache) for production

---

**Made with ❤️ for the awesome list community**