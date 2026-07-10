# Dockerfile for RadioTaxi Dashboard
FROM node:20-slim AS builder

ENV NODE_OPTIONS="--max-old-space-size=2048"

WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/dispatch-dashboard/package.json ./apps/dispatch-dashboard/
COPY apps/client-app/package.json ./apps/client-app/
COPY apps/driver-app/package.json ./apps/driver-app/
COPY packages/shared/types/package.json ./packages/shared/types/
COPY packages/shared/utils/package.json ./packages/shared/utils/
COPY services/api/package.json ./services/api/
COPY services/pricing-engine/package.json ./services/pricing-engine/
COPY services/realtime/package.json ./services/realtime/
COPY services/telephony/package.json ./services/telephony/

RUN npm install --no-audit --no-fund

COPY apps/dispatch-dashboard ./apps/dispatch-dashboard
WORKDIR /app/apps/dispatch-dashboard

# Ensure public directory exists so Docker doesn't fail on COPY
RUN mkdir -p public

RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/apps/dispatch-dashboard/.next/standalone ./
COPY --from=builder /app/apps/dispatch-dashboard/.next/static ./apps/dispatch-dashboard/.next/static
COPY --from=builder /app/apps/dispatch-dashboard/public ./apps/dispatch-dashboard/public

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001 || exit 1

CMD ["node", "apps/dispatch-dashboard/server.js"]
