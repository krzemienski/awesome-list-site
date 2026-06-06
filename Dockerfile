# Multi-stage Dockerfile for awesome-list-site production deployment

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Enable pnpm via corepack, pinned to the version that produced pnpm-lock.yaml
# (v9.0 lockfile). Unpinned corepack pulls pnpm 11, which requires Node 22+ and
# crashes on node:20-alpine with ERR_UNKNOWN_BUILTIN_MODULE.
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app

# Copy manifest + lockfile for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (frontend + backend)
# This runs: vite build && esbuild server/index.ts
RUN pnpm build

# Stage 2: Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app

# Create a non-root user to run the app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Copy manifest + lockfile and install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts and runtime files, owned by the non-root user.
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./tsconfig.json

# Set environment to production
ENV NODE_ENV=production

# Expose port (can be overridden by PORT env var)
EXPOSE 5000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Drop privileges before running the app
USER nodejs

# Start the application
CMD ["node", "dist/index.js"]
