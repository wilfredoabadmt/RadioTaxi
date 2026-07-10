FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl
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
COPY services/api ./services/api
WORKDIR /app/services/api
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./
COPY --from=builder /app/services/api/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
