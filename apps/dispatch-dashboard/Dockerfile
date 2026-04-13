# Dockerfile for RadioTaxi Dashboard (Next.js Standalone)
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace meta
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/dispatch-dashboard/package.json ./apps/dispatch-dashboard/
COPY apps/dispatch-dashboard/tsconfig.json ./apps/dispatch-dashboard/

# Install dependencies for the whole monorepo (needed for build context)
RUN npm install

# Copy source
COPY apps/dispatch-dashboard ./apps/dispatch-dashboard

# Build (ensure NEXT_PUBLIC variables are available if needed at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/dispatch-dashboard
RUN npm run build

# Runner stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Next.js standalone output copy
COPY --from=builder /app/apps/dispatch-dashboard/.next/standalone ./
COPY --from=builder /app/apps/dispatch-dashboard/.next/static ./apps/dispatch-dashboard/.next/static
COPY --from=builder /app/apps/dispatch-dashboard/public ./apps/dispatch-dashboard/public

EXPOSE 3001

# Healthcheck to the dashboard login page
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001 || exit 1

# Start the standalone server
CMD ["node", "apps/dispatch-dashboard/server.js"]
