# Root Dockerfile for RadioTaxi (API focus) - Using Debian Slim for better Prisma compatibility
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
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

# Install OpenSSL in runner too
RUN apt-get update -y && apt-get install -y openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./
COPY --from=builder /app/services/api/prisma ./prisma

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

# Start with detailed logging
CMD ["sh", "-c", "echo 'Starting API Service...' && (npx prisma migrate deploy || echo 'Warning: Migration failed, check DATABASE_URL') && node dist/main.js"]
