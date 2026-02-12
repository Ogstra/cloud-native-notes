# Build dependencies
FROM node:20-bookworm AS deps
WORKDIR /app
COPY app/backend/package.json app/backend/package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps --no-audit --progress=false

# Builder
FROM deps AS builder
WORKDIR /app
COPY app/backend/ ./
RUN npm run build

# Runtime production dependencies
FROM node:20-bookworm AS prod-deps
WORKDIR /app
COPY app/backend/package.json app/backend/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps --no-audit --progress=false

# Minimal runner
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=prod-deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=appuser:appgroup /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/scripts ./scripts
COPY app/backend/certs/rds-combined-ca-bundle.pem /app/certs/rds-combined-ca-bundle.pem

ENV NODE_ENV=production

EXPOSE 3000

USER appuser

CMD ["node", "dist/src/main.js"]
