# Dockerfile for RadioTaxi Realtime Service - Debian Slim
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace meta
COPY package.json package-lock.json* tsconfig.base.json ./
COPY services/realtime/package.json ./services/realtime/
COPY services/realtime/tsconfig.json ./services/realtime/

# Install dependencies
RUN npm install

# Copy source
COPY services/realtime ./services/realtime

# Build
WORKDIR /app/services/realtime
RUN npm run build

# Runner stage
FROM node:20-slim
WORKDIR /app

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/realtime/dist ./dist
COPY --from=builder /app/services/realtime/package.json ./

EXPOSE 3002
ENV PORT 3002
ENV NODE_ENV production

# Healthcheck for Socket.io server
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3002 || exit 1

# Start script
CMD ["node", "dist/main.js"]
