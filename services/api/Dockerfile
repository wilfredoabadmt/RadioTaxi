# Multi-stage Dockerfile for NestJS + Prisma
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY services/api/package.json ./services/api/
COPY packages/ ./packages/

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

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
