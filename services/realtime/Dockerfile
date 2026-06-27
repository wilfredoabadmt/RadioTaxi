FROM node:20-alpine

WORKDIR /app

# Dependencias
COPY services/realtime/package.json ./
COPY services/api/prisma ./prisma
RUN npm install
RUN npx prisma generate

# Código
COPY services/realtime/src ./src
COPY services/realtime/tsconfig.json ./

EXPOSE 3002
CMD ["npm", "run", "dev"]
