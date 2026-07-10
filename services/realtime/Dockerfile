# ── Realtime build — STANDALONE ────────────────────────────────────────
# realtime no depende de otros workspaces; solo reutiliza el ESQUEMA Prisma
# de services/api para generar el cliente. Se instala únicamente services/
# realtime (no todo el monorepo) para evitar arrastrar las apps Expo, que
# hacían fallar el `npm install` por peer-deps / OOM.
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/services/realtime

# 1) Solo las dependencias de realtime
COPY services/realtime/package.json ./
RUN npm install --no-audit --no-fund

# 2) tsconfig base (realtime lo referencia como ../../tsconfig.base.json)
COPY tsconfig.base.json /app/tsconfig.base.json

# 3) Esquema Prisma compartido (vive en services/api) + generar cliente
COPY services/api/prisma /app/services/api/prisma
RUN npx prisma generate --schema=/app/services/api/prisma/schema.prisma

# 4) Código + build
COPY services/realtime/ ./
RUN npm run build

# ── Runner ─────────────────────────────────────────────────────────────
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002

COPY --from=builder /app/services/realtime/node_modules ./node_modules
COPY --from=builder /app/services/realtime/dist ./dist
COPY --from=builder /app/services/realtime/package.json ./

EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3002 || exit 1

CMD ["node", "dist/index.js"]
