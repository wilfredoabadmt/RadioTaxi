FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/services/telephony

COPY services/telephony/package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.base.json /app/tsconfig.base.json
COPY services/telephony/ ./
RUN npm run build

FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003

COPY --from=builder /app/services/telephony/node_modules ./node_modules
COPY --from=builder /app/services/telephony/dist ./dist
COPY --from=builder /app/services/telephony/package.json ./

EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

CMD ["node", "dist/index.js"]
