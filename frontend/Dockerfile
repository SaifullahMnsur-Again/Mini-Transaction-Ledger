# ==========================================
# OPTIMIZED REACT FRONTEND DOCKERFILE
# For: 1GB RAM VM (Multi-stage build)
# ==========================================

# Stage 1: Build (only used for building, discarded after)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first (better layer caching)
COPY package*.json ./

# Install dependencies with npm ci (cleaner than npm install)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build React app for production
RUN npm run build

# ==========================================
# Stage 2: Runtime (ultra-minimal)
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Install only serve to run the static build
RUN npm install -g serve --no-save && \
    npm cache clean --force

# Copy only the built files from Stage 1
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Use serve to run the static build (lightweight)
CMD ["serve", "-s", "build", "-l", "3000", "--no-clipboard"]