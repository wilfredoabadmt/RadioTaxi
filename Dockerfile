# Root Dockerfile for RadioTaxi (API focus) - Debian Slim
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl

# Copy workspace meta
COPY package.json package-lock.json* tsconfig.base.json ./
COPY services/api/package.json ./services/api/
COPY services/api/tsconfig.json ./services/api/

# Install dependencies
RUN npm install

# Copy source
COPY services/api ./services/api

# Build
WORKDIR /app/services/api
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl wget

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./
COPY --from=builder /app/services/api/prisma ./prisma

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

# Improved Healthcheck with longer start period (30s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/users || exit 1

# Start script
CMD ["sh", "-c", "echo 'Starting API Service...' && (npx prisma migrate deploy || echo 'Warning: Migration failed, check DATABASE_URL') && node dist/main.js"]
