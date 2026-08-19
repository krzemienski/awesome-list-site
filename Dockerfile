# Multi-stage Dockerfile for awesome-list-site production deployment

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Clerk's browser key is compiled into the Vite bundle. It is publishable
# (not secret), but must be supplied when the image is built.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL=/api/__clerk
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL

# Copy package files and the clean-install policy used by this repository.
COPY package*.json .npmrc ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (frontend + backend)
# This runs: vite build && esbuild server/index.ts
RUN node -e "if (!process.env.VITE_CLERK_PUBLISHABLE_KEY) { console.error('VITE_CLERK_PUBLISHABLE_KEY build argument is required'); process.exit(1); }"
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files and the same clean-install policy as the build stage.
COPY package*.json .npmrc ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy necessary runtime files
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/shared ./shared
COPY --from=builder --chown=node:node /app/migrations ./migrations
COPY --from=builder --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json

# The official Node Alpine image includes an unprivileged `node` user.
USER node

# Set environment to production
ENV NODE_ENV=production

# Expose port (can be overridden by PORT env var)
EXPOSE 5000

# Readiness includes migration state and a bounded query against the catalog DB.
# Use /api/health/live separately when an orchestrator supports distinct probes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health/ready', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "dist/index.js"]
