# Awesome Video Resource Viewer

A production-ready React application for browsing and discovering 2,600+ curated video development resources. Features AI-powered recommendations, admin curation tools, GitHub synchronization, and awesome-lint compliant exports.

[![Build Status](https://github.com/krzemienski/awesome-list-site/actions/workflows/deploy.yml/badge.svg)](https://github.com/krzemienski/awesome-list-site/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/krzemienski/awesome-list-site/blob/main/CONTRIBUTING.md)
[![awesome-lint](https://img.shields.io/badge/awesome--lint-compliant-brightgreen)](https://github.com/sindresorhus/awesome-lint)

**If you find this project useful, please [⭐ star this repository](https://github.com/krzemienski/awesome-list-site)!**

## Features

### For Users
- **Resource Discovery**: Browse 2,600+ curated video development resources
- **Advanced Search**: Fuzzy search with keyboard shortcut (⌘K)
- **3-Level Navigation**: Categories → Subcategories → Sub-subcategories
- **Learning Journeys**: Guided learning paths for skill development
- **Bookmarks & Favorites**: Save resources for later
- **Mobile-Optimized**: Responsive design with WCAG AAA touch targets
- **Dark Theme**: Pure black cyberpunk aesthetic

### For Administrators
- **Resource Curation**: Approve/reject submissions, edit resources
- **Edit Suggestion Queue**: Review and merge community contributions
- **GitHub Sync**: Import from and export to awesome-list repositories
- **AI Enrichment**: Batch metadata extraction using Claude AI
- **Validation**: awesome-lint compliance checking and link verification
- **Audit Trail**: Complete history of all changes

## Screenshots

<!-- Screenshots coming soon -->
_Screenshots will be added before v1.0 release_

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, Wouter |
| **UI** | Tailwind CSS, shadcn/ui, Lucide icons |
| **Backend** | Express.js, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL (Neon-backed) |
| **AI** | Anthropic Claude API |
| **Auth** | Replit OAuth, local email/password |

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:5000
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](docs/SETUP.md) | Development environment setup |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design |
| [API.md](docs/API.md) | Complete API reference |
| [ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md) | Administrator documentation |
| [CODE-MAP.md](docs/CODE-MAP.md) | Codebase navigation guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |

## Project Structure

```
├── client/src/           # React frontend
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route pages (17 pages)
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities
├── server/               # Express backend
│   ├── ai/               # AI services (Claude, enrichment)
│   ├── github/           # GitHub sync integration
│   ├── validation/       # awesome-lint, link checking
│   ├── routes.ts         # API endpoints (75+ routes)
│   └── storage.ts        # Database layer
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle schema, Zod validation
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

## Key Features

### GitHub Sync
Import resources from any awesome-list repository:
```bash
POST /api/admin/import-github
{ "repoUrl": "https://raw.githubusercontent.com/user/repo/main/README.md" }
```

Export to awesome-lint compliant markdown:
```bash
POST /api/admin/export
```

### AI Enrichment
Automatically enhance resources with:
- Page metadata (title, description, OG images)
- AI-generated tags and categorization
- Favicon extraction

### awesome-lint Compliance
Exports pass all awesome-lint rules except:
- `awesome-contributing`: Requires CONTRIBUTING.md in repo
- `awesome-github`: Requires git repository

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-string>

# Replit Auth
REPLIT_DOMAINS=...

# Optional - AI Features
AI_INTEGRATIONS_ANTHROPIC_API_KEY=...

# Optional - GitHub Sync
GITHUB_TOKEN=...
GITHUB_REPO_URL=...
```

## Admin Access

Create an admin user:
```bash
npx tsx scripts/reset-admin-password.ts
```

Access admin panel at `/admin` after login.

## API Overview

| Category | Endpoints |
|----------|-----------|
| Resources | CRUD, search, filtering |
| Categories | 3-level hierarchy management |
| Auth | OAuth, local, session management |
| Admin | User management, curation, audit |
| GitHub | Import, export, sync queue |
| AI | Claude analysis, batch enrichment |
| Validation | awesome-lint, link checking |

See [API.md](docs/API.md) for complete reference.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License

## Acknowledgments

- Data sourced from [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video)
- Built with [shadcn/ui](https://ui.shadcn.com/) components
- AI powered by [Anthropic Claude](https://anthropic.com/)
- Deployed on [Replit](https://replit.com/)
