# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install deps first (layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && npm run rebuild:better-sqlite3

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies (wget for healthcheck, python/make/g++ for native modules)
RUN apk add --no-cache python3 make g++ wget

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm run rebuild:better-sqlite3

# Copy built output
COPY --from=builder /app/dist ./dist

# Copy runtime assets & configuration
COPY migrations/ ./migrations/
COPY prompts/ ./prompts/
COPY src/config/taxonomy_config.yaml ./src/config/taxonomy_config.yaml
COPY taxonomy_config.yaml ./
COPY data/ ./data/
COPY public/ ./public/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Default port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "dist/server.js"]
