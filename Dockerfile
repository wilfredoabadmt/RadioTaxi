# Root Dockerfile fallback for Coolify
# This builds the API service by default if Docker Compose is not used
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/api/package.json ./services/api/
RUN npm install
COPY services/api ./services/api
WORKDIR /app/services/api
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./
COPY --from=builder /app/services/api/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
