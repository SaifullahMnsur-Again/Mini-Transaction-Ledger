# ==========================================
# OPTIMIZED REACT FRONTEND DOCKERFILE
# For: 1GB RAM VM (Multi-stage build)
# ==========================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Fixed: removed --only=production (need devDeps for tsc/vite)
# Fixed: added cache mount, removed cache clean
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM node:20-alpine

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm \
    npm install -g serve --no-save

COPY --from=builder /app/build ./build

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000", "--no-clipboard"]   