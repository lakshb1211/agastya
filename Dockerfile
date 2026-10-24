# Single container: builds the Vite frontend, then serves it plus the API with Express
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server/index.js"]
