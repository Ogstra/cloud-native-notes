# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM nginxinc/nginx-unprivileged:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx Config for SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
