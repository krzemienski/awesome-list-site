# Awesome Video Resource Viewer

[![CI](https://github.com/krzemienski/awesome-list-site/actions/workflows/ci.yml/badge.svg)](https://github.com/krzemienski/awesome-list-site/actions/workflows/ci.yml)

A modern React application for browsing and discovering video development resources from the [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video) repository.

## Features

- 🎥 Browse 2,000+ curated video development resources
- 🔍 Advanced search and filtering capabilities
- 📱 Mobile-optimized responsive design
- 🌙 Dark/light theme support
- 📊 Analytics dashboard with resource insights
- 🏷️ Organized by 55+ categories including:
  - Adaptive Streaming
  - FFmpeg Tools
  - Encoding & Codecs
  - Infrastructure & Delivery
  - Learning Resources
  - And many more...

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Node.js + Express
- **Data Source**: GitHub API (krzemienski/awesome-video)
- **Analytics**: Google Analytics 4

## Quick Start

### Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: http://localhost:5000

### Production Build

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## Testing

### Run Tests

**Watch mode** (recommended for development):
```bash
npm test
```

**Single run** (for CI/CD):
```bash
npm run test:run
```

### Code Quality

**Type checking**:
```bash
npm run check
```

**Linting**:
```bash
npm run lint
```

**Run all checks** (type check + lint + tests):
```bash
npm run check && npm run lint && npm run test:run
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configuration
├── server/                # Express backend
│   ├── routes.ts          # API endpoints
│   └── awesome-video-parser.ts  # Data parser
├── shared/                # Shared types and schemas
└── scripts/               # Build and deployment scripts
```

## Configuration

### Environment Variables

- `VITE_GA_MEASUREMENT_ID`: Google Analytics measurement ID (optional)
- `DATABASE_URL`: PostgreSQL connection string (if using database)

### Data Source

The application fetches data from the `krzemienski/awesome-video` repository, which contains a curated list of video development tools, libraries, and resources organized by category.

## Features in Detail

### Resource Discovery
- Browse resources by category (Adaptive Streaming, FFmpeg, Encoding, etc.)
- Search across titles, descriptions, and tags
- Filter by resource type and popularity

### Analytics Dashboard
- View resource distribution by category
- Track popular resources and trends
- Monitor search patterns and user engagement

### Mobile Experience
- Responsive design optimized for all screen sizes
- Touch-friendly navigation and interactions
- Fast loading with optimized resource delivery

## Contributing

This project displays resources from the [awesome-video](https://github.com/krzemienski/awesome-video) repository. To contribute new resources or suggest improvements, please submit them to the original repository.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Data sourced from [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video)
- Built with modern web technologies and best practices
- Designed for the video development community