# Near — imagen de producción (it31).
# Multi-stage: deps → build standalone de Next → runner mínimo con el CLI de
# prisma para aplicar migraciones en el arranque (docker-entrypoint.sh).

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
# el postinstall ejecuta `prisma generate`: necesita el esquema
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# CLI de prisma (misma versión que @prisma/client) para `migrate deploy`
RUN npm install -g prisma@5.22.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY prisma ./prisma
COPY docker-entrypoint.sh ./

# modo local de archivos (sin S3): las subidas viven aquí — móntalo como
# volumen si no usas R2/S3, o se pierden con cada deploy
RUN mkdir -p uploads && chown -R node:node /app
USER node

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
