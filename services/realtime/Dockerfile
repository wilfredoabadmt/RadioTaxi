FROM node:20-alpine
WORKDIR /app
COPY services/realtime/package.json ./
RUN npm install
COPY services/realtime/src ./src
COPY services/realtime/tsconfig.json ./
EXPOSE 3002
CMD ["npm", "run", "dev"]
