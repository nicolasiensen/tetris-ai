# Build stage
FROM node:20-slim AS build

RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --omit=dev

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server

CMD ["node", "--import", "tsx", "server/index.ts"]
