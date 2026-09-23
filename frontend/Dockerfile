# ==========================================
# STAGE 1: Build (Node SDK + npm Cache Mount)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

# Cache mount: Persists npm download cache on host, completely bypassing image layers
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Production Web Server (Minimal Nginx)
# ==========================================
FROM nginx:alpine-slim AS final
EXPOSE 80

# Copy ONLY compiled static bundle (HTML/JS/CSS)
COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]