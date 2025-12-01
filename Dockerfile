# Multi-stage build for Node.js application
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (need devDependencies for vite in production)
FROM base AS deps
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force

# Build application
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
ARG PORT=3000
ENV NODE_ENV=production
ENV PORT=$PORT

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --chown=nodejs:nodejs shared ./shared
COPY --chown=nodejs:nodejs server ./server

USER nodejs

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
