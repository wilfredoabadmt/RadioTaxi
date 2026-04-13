FROM node:20-alpine AS base
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/dispatch-dashboard/package.json ./apps/dispatch-dashboard/
RUN npm install
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/dispatch-dashboard ./apps/dispatch-dashboard
ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app/apps/dispatch-dashboard
RUN npm run build
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/dispatch-dashboard/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dispatch-dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dispatch-dashboard/.next/static ./.next/static
USER nextjs
EXPOSE 3001
ENV PORT 3001
CMD ["node", "server.js"]
