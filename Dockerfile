# Root Dockerfile for RadioTaxi (API focus)
FROM node:20-alpine AS builder

WORKDIR /app

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
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./
COPY --from=builder /app/services/api/prisma ./prisma

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api || exit 1

# Start with detailed logging
CMD ["sh", "-c", "echo 'Starting API Service...' && (npx prisma migrate deploy || echo 'Warning: Migration failed, check DATABASE_URL') && node dist/main.js"]
