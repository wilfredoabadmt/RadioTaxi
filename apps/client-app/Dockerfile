# Dockerfile for RadioTaxi Client App (Web)
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/client-app/package.json ./apps/client-app/
RUN npm install
COPY apps/client-app ./apps/client-app
WORKDIR /app/apps/client-app
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3003
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/apps/client-app/.next/standalone ./
COPY --from=builder /app/apps/client-app/.next/static ./apps/client-app/.next/static
COPY --from=builder /app/apps/client-app/public ./apps/client-app/public
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003 || exit 1
CMD ["node", "apps/client-app/server.js"]
