#!/usr/bin/env bash
# Borra de la base de datos las parejas creadas por los tests E2E (it32).
#
# Los tests de Playwright registran usuarios DE VERDAD. Al ejecutarlos contra
# el despliegue en vez de contra una instancia de pruebas, esas parejas se
# quedan en la base de datos real. Este script las quita.
#
# Se reconocen sin ambigüedad por el dominio `@near.test`: el TLD `.test` está
# reservado por la RFC 2606 justo para esto, así que ninguna persona real puede
# tener un correo así. Aun así el script ENSEÑA lo que va a borrar y pide
# confirmación antes de tocar nada.
#
# Uso:
#   export DATABASE_URL='postgresql://...'   # la de produccion
#   bash scripts/limpiar-pruebas.sh
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
PG_IMAGE="postgres:18-alpine"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL." >&2
  exit 1
fi

# El SQL entra por stdin: montar volúmenes y anidar comillas a través de
# docker → sh → psql es una fuente inagotable de erratas.
sql() {
  docker run --rm -i -e PGURL="$DATABASE_URL" "$PG_IMAGE" \
    sh -c 'psql "$PGURL" -v ON_ERROR_STOP=1 -q "$@"' -- "$@"
}

echo "→ Lo que hay ahora:"
sql -t -A -F' | ' <<'SQL'
SELECT 'usuarios de prueba', count(*) FROM "User" WHERE email LIKE '%@near.test'
UNION ALL SELECT 'usuarios reales', count(*) FROM "User" WHERE email NOT LIKE '%@near.test'
UNION ALL SELECT 'parejas', count(*) FROM "Couple";
SQL

echo
echo "→ Usuarios que NO se tocan (los reales):"
sql -t -A <<'SQL'
SELECT email FROM "User" WHERE email NOT LIKE '%@near.test' ORDER BY email;
SQL

echo
echo "Se borrarán los usuarios @near.test y las parejas en las que TODOS sus"
echo "miembros son de prueba. Nada más."
echo
printf "¿Seguimos? (escribe: si) "
read -r RESPUESTA
if [ "$RESPUESTA" != "si" ]; then
  echo "Cancelado. No se ha tocado nada."
  exit 0
fi

echo
echo "→ Borrando…"
# Primero las parejas: al borrarlas caen en cascada sus datos compartidos
# (mensajes, momentos, sala…). Se exige que NINGÚN miembro sea real, para que
# una pareja mixta —imposible aquí, pero por si acaso— nunca se vea afectada.
# Después los usuarios: User.coupleId es SetNull, así que borrar la pareja no
# se los lleva por delante.
sql <<'SQL'
BEGIN;
DELETE FROM "Couple" c
WHERE EXISTS (SELECT 1 FROM "User" u WHERE u."coupleId" = c.id)
  AND NOT EXISTS (
    SELECT 1 FROM "User" u
    WHERE u."coupleId" = c.id AND u.email NOT LIKE '%@near.test'
  );
DELETE FROM "User" WHERE email LIKE '%@near.test';
COMMIT;
SQL

echo
echo "→ Cómo queda:"
sql -t -A -F' | ' <<'SQL'
SELECT relname, conteo FROM (
  SELECT c.relname,
         (xpath('/row/c/text()',
                query_to_xml(format('SELECT count(*) AS c FROM public.%I', c.relname),
                             false, true, '')))[1]::text::bigint AS conteo
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
) t WHERE conteo > 0 ORDER BY conteo DESC, relname;
SQL

echo
echo "✓ Listo. Deberían quedar tus 28 preguntas del día, las 12 del quiz y las"
echo "  9 migraciones. Si sigue habiendo usuarios, son reales."
