# ── Dashboard build — STANDALONE (Ultra Rápido) ─────────────────────────
# Instala exclusivamente las dependencias directas de dispatch-dashboard (Next.js, React, Leaflet, Tailwind)
# evitando descargar Expo, React Native, NestJS o Prisma, reduciendo el build de 15m a ~1m.
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/dispatch-dashboard

# Configurar reintentos y timeouts robustos para npm (evita ETIMEDOUT en VPS)
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000

# 1) Instalar SOLO dependencias del dashboard para máxima eficiencia de caché Docker
COPY apps/dispatch-dashboard/package.json apps/dispatch-dashboard/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# 2) tsconfig base (referenciado como ../../tsconfig.base.json)
COPY tsconfig.base.json /app/tsconfig.base.json

# 3) Código fuente del dashboard
COPY apps/dispatch-dashboard/ ./

# 4) Asegurar directorio public para evitar fallos de copia
RUN mkdir -p public

# 5) Build de Next.js (genera .next/standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner de producción ────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Next.js standalone: copiar archivos estáticos tanto en raíz como en subdirectorio para garantizar que nunca den 404
COPY --from=builder /app/apps/dispatch-dashboard/.next/standalone ./
COPY --from=builder /app/apps/dispatch-dashboard/.next/static ./.next/static
COPY --from=builder /app/apps/dispatch-dashboard/.next/static ./apps/dispatch-dashboard/.next/static
COPY --from=builder /app/apps/dispatch-dashboard/public ./public
COPY --from=builder /app/apps/dispatch-dashboard/public ./apps/dispatch-dashboard/public

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001 || exit 1

# Compatible tanto si standalone genera server.js en raíz o en subdirectorio
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else node apps/dispatch-dashboard/server.js; fi"]
