# Dockerfile for RadioTaxi Driver App (Web)
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/driver-app/package.json ./apps/driver-app/
RUN npm install
COPY apps/driver-app ./apps/driver-app
WORKDIR /app/apps/driver-app
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3004
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/apps/driver-app/.next/standalone ./
COPY --from=builder /app/apps/driver-app/.next/static ./apps/driver-app/.next/static
COPY --from=builder /app/apps/driver-app/public ./apps/driver-app/public
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3004 || exit 1
CMD ["node", "apps/driver-app/server.js"]
