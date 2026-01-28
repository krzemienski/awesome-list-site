# Development Setup Guide

Complete guide for setting up and running the Awesome Video Resource Viewer locally.

## Prerequisites

- Node.js 18+ (automatically provided by Replit)
- PostgreSQL database (automatically provisioned by Replit)
- Git (for version control)

## Quick Start

### 1. Clone/Fork the Repository

If running on Replit, the repository is already set up. Otherwise:
```bash
git clone <repository-url>
cd awesome-video-resource-viewer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create or verify the following environment variables:

**Required:**
```bash
DATABASE_URL=postgresql://...      # Automatically set by Replit PostgreSQL
SESSION_SECRET=<random-string>      # For session encryption
```

**For Replit Auth:**
```bash
REPLIT_DOMAINS=<your-replit-domain>
REPLIT_IDENTITY_TOKEN=<auto-set>
```

**For AI Features:**
```bash
AI_INTEGRATIONS_ANTHROPIC_API_KEY=<your-claude-api-key>
```

**For GitHub Sync:**
```bash
GITHUB_TOKEN=<your-github-pat>
GITHUB_REPO_URL=https://github.com/user/repo
```

### 4. Database Setup

The database is automatically created and seeded on first startup. To manually seed:
```bash
# Via API (requires admin login)
curl -X POST http://localhost:5000/api/admin/seed-database
```

### 5. Start Development Server

```bash
npm run dev
```

This starts:
- Express backend on port 5000
- Vite dev server with HMR
- Both accessible at `http://localhost:5000`

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:push --force` | Force push schema (use with caution) |
| `npm run db:studio` | Open Drizzle Studio for database GUI |

## Project Structure

```
├── client/src/           # React frontend
│   ├── components/       # Reusable components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── server/               # Express backend
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database layer
│   └── ai/               # AI services
├── shared/               # Shared types
│   └── schema.ts         # Database schema
└── docs/                 # Documentation
```

## Creating an Admin User

### Option 1: Reset Admin Password Script
```bash
npx tsx scripts/reset-admin-password.ts
```
This creates or resets the admin user with credentials shown in console output.

### Option 2: Via Database
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### Option 3: First Replit Auth User
The first user to log in via Replit OAuth can be promoted to admin via the database.

## Database Management

### View Database
```bash
npm run db:studio
```
Opens Drizzle Studio at `https://local.drizzle.studio`

### Schema Changes
1. Edit `shared/schema.ts`
2. Run `npm run db:push`
3. Restart the dev server

### Seeding Data
The database auto-seeds on startup if empty. For manual seeding:
- Login as admin
- Navigate to Admin Dashboard
- Use "Seed Database" or "Import from GitHub"

## Working with AI Features

### Claude Integration
1. Ensure `AI_INTEGRATIONS_ANTHROPIC_API_KEY` is set
2. AI features include:
   - URL analysis for edit suggestions
   - Batch resource enrichment
   - Personalized recommendations

### Enrichment Jobs
1. Navigate to Admin → Enrichment
2. Select filter (unenriched, all)
3. Set batch size
4. Click "Start Enrichment"

## GitHub Sync

### Import from GitHub
1. Navigate to Admin → GitHub Sync
2. Enter repository URL (raw README.md URL)
3. Choose dry-run or strict mode
4. Click Import

### Export to GitHub
1. Configure repository in Admin → Settings
2. Navigate to Admin → Export
3. Click "Export to GitHub"
4. Creates PR with awesome-lint compliant markdown

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:5000`
3. Test features via UI

### awesome-lint Validation
```bash
npx tsx scripts/test-awesome-lint.ts
```

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Get resources
curl http://localhost:5000/api/resources

# Get awesome list
curl http://localhost:5000/api/awesome-list
```

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npm run db:studio
```

### Port Already in Use
Kill existing processes:
```bash
pkill -f "tsx server"
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Session Issues
- Clear browser cookies
- Restart dev server
- Check SESSION_SECRET is set

## Code Style

- TypeScript throughout
- No explicit React imports (JSX transform handles it)
- Tailwind CSS for styling
- shadcn/ui components
- Drizzle ORM for database
- Zod for validation

## Helpful Tips

1. **Hot Reload**: Vite provides HMR for frontend changes
2. **Backend Restart**: Server restarts automatically on file changes
3. **Database GUI**: Use `npm run db:studio` for visual database management
4. **Logs**: Check console output for API logs
5. **TypeScript**: Run `npx tsc --noEmit` to check types

## Production Deployment

1. Set `NODE_ENV=production`
2. Run `npm run build`
3. Run `npm run start`
4. Or use Replit's Deploy button

The application automatically:
- Builds optimized frontend bundle
- Serves static files from Express
- Seeds database if empty
- Validates awesome-list on export
