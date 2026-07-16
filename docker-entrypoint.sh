#!/bin/sh
# Arranque de producción: migraciones primero, servidor después.
# `migrate deploy` es idempotente y no genera migraciones nuevas: solo aplica
# las pendientes de prisma/migrations. Si la BD no responde, el proceso muere
# y la plataforma reintenta (mejor que servir a medias).
set -e

echo ">> prisma migrate deploy"
prisma migrate deploy --schema prisma/schema.prisma

echo ">> near en marcha (version: ${APP_VERSION:-dev})"
exec node server.js
