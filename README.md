# Awesome Video Resources Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Powered-green)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

A modern, AI-powered platform for discovering and curating **2,644+ video development resources** from the [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video) repository.

## ✨ Features

### For Users
- 🎥 **Browse 2,644+ Resources** - Curated video tools, libraries, and learning materials
- 🔍 **Advanced Search** - Full-text search with filters and fuzzy matching
- 📱 **Mobile-First Design** - Responsive interface optimized for all devices
- 🌙 **Dark/Light Theme** - System-aware theme with manual toggle
- 💾 **Personal Library** - Bookmark and favorite resources
- 🎓 **Learning Journeys** - AI-generated structured learning paths
- 🔐 **OAuth Authentication** - Sign in with GitHub, Google, or email

### For Admins
- 🛡️ **Admin Dashboard** - Comprehensive resource management
- ✅ **Bulk Operations** - Approve, reject, or delete multiple resources
- 🤖 **AI Enrichment** - Automated tagging and categorization via Claude Haiku 4.5
- 🔄 **GitHub Sync** - Bidirectional import/export with awesome-list repositories
- 📊 **Analytics** - Resource distribution, user engagement, and trends
- 🔍 **Validation Tools** - awesome-lint compliance and broken link detection
- 📝 **Audit Logging** - Track all admin actions and changes

### For Developers
- 🏗️ **Modern Stack** - React 18, TypeScript, Supabase, Docker
- 🎨 **shadcn/ui Components** - 50+ accessible, customizable UI components
- 🔒 **Row-Level Security** - Supabase RLS for data protection
- 🚀 **CI/CD Ready** - Docker Compose for easy deployment
- 📚 **Comprehensive Docs** - Architecture, API, and deployment guides

## 🏗️ Technology Stack

### Frontend
- **Framework**: React 18.3 with TypeScript 5.3
- **Build Tool**: Vite 5.4 (fast HMR, optimized builds)
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query v5 (React Query)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS v4 (OKLCH color space, cyberpunk theme)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Analytics**: Google Analytics 4 integration

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM (TypeScript-first)
- **Authentication**: Supabase Auth (JWT, OAuth)
- **Caching**: Redis 7 (distributed caching)
- **AI**: Anthropic Claude Haiku 4.5

### Infrastructure
- **Deployment**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (SSL, rate limiting)
- **Database**: Supabase PostgreSQL (managed)
- **Auth**: Supabase Auth (GitHub, Google, email)
- **Storage**: Supabase Storage (future: avatars, thumbnails)

### DevOps
- **Containerization**: Docker multi-stage builds
- **Orchestration**: Docker Compose
- **Testing**: Playwright (E2E), Vitest (unit)
- **CI/CD**: GitHub Actions (future)
- **Monitoring**: Supabase Dashboard, Docker logs

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

## 📁 Project Structure

```
awesome-list-site/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # Admin panel components (13 files)
│   │   │   ├── ai/             # AI recommendation UI
│   │   │   ├── auth/           # Auth guards (AdminGuard, AuthGuard)
│   │   │   ├── layout/         # App layout (TopBar, Sidebar, Footer)
│   │   │   ├── resource/       # Resource cards and actions
│   │   │   └── ui/             # shadcn/ui components (50+ files)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts      # Supabase Auth hook
│   │   │   ├── useAdmin.ts     # Admin dashboard hook
│   │   │   └── use-*.tsx       # Theme, toast, analytics hooks
│   │   ├── lib/
│   │   │   ├── supabase.ts     # Supabase client config
│   │   │   ├── queryClient.ts  # TanStack Query config
│   │   │   └── utils.ts        # Utility functions
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── AuthCallback.tsx
│   │   │   └── ...             # 10+ page components
│   │   └── types/              # TypeScript type definitions
│   └── public/                 # Static assets
├── server/                      # Express backend
│   ├── ai/                     # AI services (Claude integration)
│   ├── github/                 # GitHub sync & parsing
│   ├── routes.ts               # API endpoints (70+)
│   ├── storage.ts              # Database operations (Drizzle ORM)
│   ├── supabaseAuth.ts         # Auth middleware
│   └── index.ts                # Express server entry
├── shared/                      # Shared types & schemas
│   └── schema.ts               # Drizzle schema (16 tables)
├── docker/                      # Docker configuration
│   ├── nginx/                  # Nginx config + SSL
│   └── ...
├── docs/                        # Documentation
│   ├── admin-manual.md         # Admin user guide
│   ├── DEPLOYMENT_CHECKLIST.md # Pre-deployment verification
│   └── SESSION_3_COMPLETE.md   # Session 3 summary
├── supabase/
│   └── migrations/             # Database migrations (SQL)
├── tests/                       # E2E tests (Playwright)
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Web service container
└── CLAUDE.md                    # Complete architecture docs
```

## 🌐 Live Demo

**Production**: https://yourdomain.com (after deployment)
**Admin Panel**: https://yourdomain.com/admin

## 📊 Database Schema

**16 Tables**:
- Core: `resources`, `categories`, `subcategories`, `tags`
- User Data: `user_favorites`, `user_bookmarks`, `user_preferences`
- Learning: `learning_journeys`, `journey_steps`, `user_journey_progress`
- AI: `enrichment_jobs`, `enrichment_queue`, `resource_edits`
- GitHub: `github_sync_queue`, `github_sync_history`
- Audit: `resource_audit_log`

**2,644+ Resources** across 9 top-level categories:
- Adaptive Streaming, FFmpeg, Encoding & Codecs, Infrastructure & Delivery
- Learning Resources, Players, MPEG, Audio, Subtitles & Captions

## 🔐 Authentication

**Supported Methods**:
- Email/Password (with email confirmation)
- GitHub OAuth
- Google OAuth
- Magic Link (passwordless)

**User Roles**:
- **User**: Browse, bookmark, favorite, submit resources
- **Moderator**: Approve/reject resources, edit content (future)
- **Admin**: Full access to admin panel, bulk operations, AI enrichment

## 📖 Documentation

**Quick Links**:
- [Architecture Overview](CLAUDE.md) - Complete system architecture and API reference
- [Admin Manual](docs/admin-manual.md) - Guide for admin users (resource approval, AI enrichment, etc.)
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Pre-deployment verification (103 tasks)
- [Session 3 Summary](docs/SESSION_3_COMPLETE.md) - Latest development session notes

**API Documentation**:
- 70+ REST endpoints (13 public, 26 authenticated, 21 admin-only)
- OpenAPI spec: `/api/docs` (future)
- GraphQL: Not implemented (future consideration)

## 🚀 Deployment

### Quick Deploy with Docker

```bash
# 1. Clone repository
git clone https://github.com/yourusername/awesome-list-site.git
cd awesome-list-site

# 2. Configure environment
cp .env.example .env
nano .env  # Add Supabase credentials, API keys

# 3. Build and start
docker-compose up -d --build

# 4. Verify
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

**Detailed Deployment**: See [DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)

### Deployment Options

**Option A: Docker Compose** (Recommended)
- Single command deployment
- Nginx reverse proxy included
- Redis caching configured
- SSL ready

**Option B: Railway/Render**
- Connect GitHub repo
- Set environment variables
- Deploy from Dockerfile
- Auto SSL certificates

**Option C: Kubernetes**
- Create manifests from docker-compose
- Deploy to GKE/EKS/AKS
- Helm charts (future)

## 🧪 Testing

**E2E Testing** (Playwright):
```bash
# Install dependencies
npm install --save-dev @playwright/test

# Run all tests
npx playwright test

# Run specific suite
npx playwright test tests/e2e/admin-flows.spec.ts

# Run with UI
npx playwright test --ui
```

**Test Coverage**:
- Anonymous user flows (browse, search, theme)
- Authenticated user flows (login, bookmark, submit)
- Admin flows (approve, enrich, sync, validate)
- Performance tests (load time, API response)

## 🤝 Contributing

We welcome contributions! Here's how:

**For New Resources**:
1. Sign up at https://yourdomain.com
2. Click "Submit Resource" button
3. Fill out form (title, URL, description, category)
4. Submit for admin approval

**For Code Contributions**:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**For Upstream (awesome-video)**:
- This project syncs with [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video)
- Submit new resources there for inclusion in the main list

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

**Key Points**:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ⚠️ No warranty
- ⚠️ License and copyright notice required

## 🙏 Acknowledgments

**Data Source**:
- [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video) - 2,644+ curated resources

**Technologies**:
- [React](https://reactjs.org/) - UI framework
- [Supabase](https://supabase.com) - Backend platform
- [Anthropic Claude](https://www.anthropic.com) - AI enrichment
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM

**Inspiration**:
- [Awesome Lists](https://github.com/sindresorhus/awesome) - Curated list format
- [Product Hunt](https://www.producthunt.com/) - Discovery platform inspiration

## 📧 Support

**Need Help?**
- 📚 **Documentation**: Start with [CLAUDE.md](CLAUDE.md)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/awesome-list-site/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/awesome-list-site/discussions)
- 💬 **Community**: Discord server (future)

**Contact**:
- **Email**: admin@yourdomain.com
- **Twitter**: @yourusername
- **Website**: https://yourdomain.com

---

**Version**: 2.0.0
**Last Updated**: 2025-11-29
**Status**: Production Ready ✅

Built with ❤️ for the video development community