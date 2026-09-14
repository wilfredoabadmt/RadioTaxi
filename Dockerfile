# Root Dockerfile for RadioTaxi (API focus) - STANDALONE Ultra Rápido
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/services/api

# Configurar reintentos y timeouts robustos para npm (evita ETIMEDOUT en VPS)
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000

# 1) Solo dependencias de la API para caché óptima
COPY services/api/package.json services/api/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# 2) tsconfig base
COPY tsconfig.base.json /app/tsconfig.base.json

# 3) Código + cliente Prisma + build
COPY services/api/ ./
RUN npx prisma generate
RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/services/api/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./
COPY --from=builder /app/services/api/prisma ./prisma

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/auth/health || exit 1

CMD ["sh", "-c", "echo 'Starting API...' && (npx prisma migrate deploy || echo 'WARN: migrate deploy failed') && node dist/main.js"]
