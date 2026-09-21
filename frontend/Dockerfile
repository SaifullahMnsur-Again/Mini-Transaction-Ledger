# Stage 1: Build React/Vite assets
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Minimal Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled assets and lightweight server script
COPY --from=build /app/dist ./dist
COPY server.cjs ./

EXPOSE 3000

CMD ["node", "server.cjs"]