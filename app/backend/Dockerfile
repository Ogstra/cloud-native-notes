# Deps Stage
FROM node:20-bookworm AS deps
WORKDIR /app
COPY app/backend/package.json app/backend/package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps --no-audit --progress=false

# Frontend Build Stage
FROM node:20-bookworm AS frontend-builder
WORKDIR /app
COPY app/frontend/package.json app/frontend/package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps --no-audit --progress=false
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
COPY app/backend/package.json app/backend/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps --no-audit --progress=false

# Production Stage
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=frontend-builder /app/dist ./dist/client
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./package.json
COPY app/backend/certs/rds-combined-ca-bundle.pem /app/certs/rds-combined-ca-bundle.pem

EXPOSE 3000

CMD ["dist/src/main.js"]
