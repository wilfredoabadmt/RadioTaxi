# Dockerfile for RadioTaxi Realtime Service - Debian Slim
# NOTA: realtime reutiliza el esquema Prisma de services/api, por eso el
# builder copia ese schema y ejecuta `prisma generate` (el cliente generado
# viaja al runner dentro de node_modules).
FROM node:20-slim AS builder

WORKDIR /app

# OpenSSL requerido por Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copiar metadatos del workspace
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/dispatch-dashboard/package.json ./apps/dispatch-dashboard/
COPY apps/client-app/package.json ./apps/client-app/
COPY apps/driver-app/package.json ./apps/driver-app/
COPY packages/shared/types/package.json ./packages/shared/types/
COPY packages/shared/utils/package.json ./packages/shared/utils/
COPY services/api/package.json ./services/api/
COPY services/pricing-engine/package.json ./services/pricing-engine/
COPY services/realtime/package.json ./services/realtime/
COPY services/realtime/tsconfig.json ./services/realtime/
COPY services/telephony/package.json ./services/telephony/

# Instalar dependencias
RUN npm install

# Esquema Prisma (compartido con la API) + generar cliente
COPY services/api/prisma ./services/api/prisma
RUN npx prisma generate --schema=services/api/prisma/schema.prisma

# Código fuente
COPY services/realtime ./services/realtime

# Build
WORKDIR /app/services/realtime
RUN npm run build

# ---- Runner ----
FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/realtime/dist ./dist
COPY --from=builder /app/services/realtime/package.json ./

EXPOSE 3002
ENV PORT 3002
ENV NODE_ENV production

# Healthcheck del servidor Socket.io
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3002 || exit 1

CMD ["node", "dist/index.js"]
