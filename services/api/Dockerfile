# ── API build — STANDALONE ─────────────────────────────────────────────
# La API no depende de ningún otro workspace del monorepo (ver services/api/
# package.json: solo deps npm normales). Por eso se instala SOLO services/api
# en lugar de correr `npm install` sobre todo el monorepo, que arrastraba las
# apps Expo (React Native / metro / babel) y hacía fallar el build por
# conflictos de peer-deps y/o falta de memoria (OOM) en el servidor.
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/services/api

# 1) Solo las dependencias de la API (capa cacheable si no cambia el package.json)
COPY services/api/package.json ./
RUN npm install --no-audit --no-fund

# 2) tsconfig base: la API lo referencia como ../../tsconfig.base.json
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
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api || exit 1

# migrate deploy es tolerante para no bloquear el arranque si la BD aún no está lista
CMD ["sh", "-c", "echo 'Starting API...' && (npx prisma migrate deploy || echo 'WARN: migrate deploy failed') && node dist/main.js"]
