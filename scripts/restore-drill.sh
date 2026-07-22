#!/usr/bin/env bash
# Ensayo de restauración (it32).
#
# Un backup que no se ha restaurado nunca no es un backup: es una carpeta con
# ficheros que se supone que sirven. Esto coge la copia MÁS RECIENTE de R2, la
# descifra, la restaura en un Postgres desechable y cuenta lo que hay dentro.
#
# No toca producción en ningún momento: levanta su propia base de datos en un
# contenedor y la borra al terminar.
#
# Uso:
#   export S3_BUCKET=near
#   export S3_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
#   export S3_ACCESS_KEY_ID=...
#   export S3_SECRET_ACCESS_KEY=...
#   bash scripts/restore-drill.sh
#
# La BACKUP_PASSPHRASE se pide por teclado: no se pasa por argumento (quedaría
# en el historial del shell) ni por variable de entorno.
set -euo pipefail

# Git Bash en Windows reescribe los argumentos que parecen rutas antes de
# pasarlos a un ejecutable nativo: "/w" se convertía en "W:/" y docker lo
# rechazaba. Esto lo desactiva para todo el script; las rutas de dentro de los
# contenedores tienen que llegar tal cual.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

PG_IMAGE="postgres:18-alpine"
AWS_IMAGE="amazon/aws-cli:latest"
CONTENEDOR="near-restore-drill"
PUERTO=5544
TRABAJO="$(mktemp -d)"
DB_URL="postgresql://near:drill@localhost:${PUERTO}/near"

limpiar() {
  echo
  echo "→ Limpiando…"
  docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
  rm -rf "$TRABAJO"
}
trap limpiar EXIT

for v in S3_BUCKET S3_ENDPOINT S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY; do
  if [ -z "${!v:-}" ]; then
    echo "Falta la variable $v. Mira la cabecera de este script." >&2
    exit 1
  fi
done

# Sin montar volúmenes: montar una ruta de Git Bash en Docker es una fuente
# constante de problemas en Windows. La descarga sale por stdout y la recoge
# el shell, que es más simple y funciona igual en los tres sistemas.
aws_cli() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION=auto \
    "$AWS_IMAGE" "$@" --endpoint-url "$S3_ENDPOINT"
}

echo "→ Buscando la copia más reciente en R2…"
ULTIMO=$(aws_cli s3 ls "s3://${S3_BUCKET}/backups/" \
  | awk '{print $4}' | grep -E '^near-[0-9]{4}-[0-9]{2}-[0-9]{2}\.dump\.gpg$' | sort | tail -1)
if [ -z "$ULTIMO" ]; then
  echo "No hay ninguna copia en s3://${S3_BUCKET}/backups/ — el backup nunca ha llegado a subir." >&2
  exit 1
fi
echo "   $ULTIMO"

echo "→ Descargando…"
aws_cli s3 cp "s3://${S3_BUCKET}/backups/${ULTIMO}" - > "${TRABAJO}/${ULTIMO}"
CIFRADO_BYTES=$(stat -c%s "${TRABAJO}/${ULTIMO}" 2>/dev/null || stat -f%z "${TRABAJO}/${ULTIMO}")
if [ "$CIFRADO_BYTES" -lt 100 ]; then
  echo "La descarga vino vacía o truncada ($CIFRADO_BYTES bytes)." >&2
  exit 1
fi
echo "   $(( CIFRADO_BYTES / 1024 )) KB cifrados"

echo
echo "→ Escribe la BACKUP_PASSPHRASE (no se muestra):"
read -r -s PASSPHRASE
echo

echo "→ Descifrando…"
if ! gpg --batch --yes --quiet --decrypt --passphrase "$PASSPHRASE" \
      --output "${TRABAJO}/near.dump" "${TRABAJO}/${ULTIMO}" 2>"${TRABAJO}/gpg.err"; then
  echo "No se pudo descifrar. Si la passphrase es correcta, el fichero está corrupto:" >&2
  cat "${TRABAJO}/gpg.err" >&2
  exit 1
fi
PLANO_BYTES=$(stat -c%s "${TRABAJO}/near.dump" 2>/dev/null || stat -f%z "${TRABAJO}/near.dump")
echo "   $(( PLANO_BYTES / 1024 )) KB descifrados"

echo "→ Levantando un Postgres desechable en el puerto ${PUERTO}…"
docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
docker run -d --name "$CONTENEDOR" \
  -e POSTGRES_USER=near -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=near \
  -p "${PUERTO}:5432" "$PG_IMAGE" >/dev/null

echo -n "   esperando"
for _ in $(seq 1 45); do
  if docker exec "$CONTENEDOR" pg_isready -U near -d near >/dev/null 2>&1; then break; fi
  echo -n "."
  sleep 1
done
echo " listo"

echo "→ Restaurando…"
docker cp "${TRABAJO}/near.dump" "${CONTENEDOR}:/tmp/near.dump" >/dev/null
# --clean/--if-exists: la BD está vacía, pero así el ensayo se parece a una
# restauración real sobre algo existente. Los avisos de "no existe" son
# normales aquí y no significan fallo.
docker exec "$CONTENEDOR" pg_restore --clean --if-exists --no-owner --no-acl \
  -U near -d near /tmp/near.dump 2>"${TRABAJO}/restore.err" || true

echo
echo "════════ QUÉ HA QUEDADO DENTRO ════════"
# Recuentos EXACTOS, no los de pg_stat_user_tables: esos son una estimación del
# recolector de estadísticas y recién restaurada la base pueden dar cero para
# tablas que sí tienen filas. En un ensayo cuyo objetivo es decidir si la copia
# es de fiar, una estimación no vale.
docker exec "$CONTENEDOR" psql -U near -d near -t -A -F' | ' -c "
  SELECT relname, conteo FROM (
    SELECT c.relname,
           (xpath('/row/c/text()',
                  query_to_xml(format('SELECT count(*) AS c FROM public.%I', c.relname),
                               false, true, '')))[1]::text::bigint AS conteo
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t
  WHERE conteo > 0
  ORDER BY conteo DESC, relname;"

TABLAS=$(docker exec "$CONTENEDOR" psql -U near -d near -t -A -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "═══════════════════════════════════════"
echo "Tablas restauradas: ${TABLAS}"

if [ "${TABLAS:-0}" -lt 10 ]; then
  echo
  echo "MAL: se esperaban ~38 tablas. Errores de la restauración:" >&2
  tail -20 "${TRABAJO}/restore.err" >&2
  exit 1
fi

echo
echo "✓ El backup se descifra y se restaura. Compara los números de arriba con"
echo "  lo que esperas tener en producción — si cuadran, la copia sirve."
