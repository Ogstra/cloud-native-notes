# Deps Stage
FROM node:20-bookworm AS deps
WORKDIR /app
COPY app/backend/package.json ./
RUN npm install --ignore-scripts --legacy-peer-deps

# Frontend Build Stage
FROM node:20-bookworm AS frontend-builder
WORKDIR /app
COPY app/frontend/package.json ./
RUN npm install --ignore-scripts --legacy-peer-deps
COPY app/frontend/ .
RUN npm run build

# Backend Build Stage
FROM deps AS builder
WORKDIR /app
COPY app/backend/ .
RUN npm run build

# Prod Deps Stage
FROM node:20-bookworm AS prod-deps
WORKDIR /app
COPY app/backend/package.json ./
COPY app/backend/prisma ./prisma
RUN npm install --legacy-peer-deps
RUN npm prune --production

# Production Stage
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=frontend-builder /app/dist ./dist/client
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["dist/src/main.js"]
