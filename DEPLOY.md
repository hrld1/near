# Desplegar Near

Guía para poner Near en internet. La **ruta A (Northflank + Neon + R2 +
Cloudflare)** es gratis y la recomendada para el piloto. La **ruta B (VPS)** lo
mete todo en una máquina tuya y queda documentada como plan B.

> Requisito que manda todo lo demás: el bus de eventos en vivo (SSE, presencia,
> carreras 1v1) vive **en memoria**. Near necesita **un proceso siempre
> encendido** — nada de serverless, nada de plataformas que hibernan.

Ese requisito descarta más plataformas de las que parece. Las capas gratuitas de
Render y de la antigua de Koyeb **bajan a cero tras 15–60 min sin tráfico**: la
app parece funcionar, pero cada noche se pierden presencia, rachas en vivo y
partidas en curso, y el primer mensaje de la mañana tarda en llegar. Northflank
es de las pocas que mantiene el contenedor encendido en su plan gratuito.

> Nota: Koyeb retiró su capa gratuita de cómputo (adquirida por Mistral AI; hoy
> el plan de entrada son 29 $/mes). Si buscas una alternativa de pago pero muy
> sólida, Fly.io cuesta ~3 €/mes con `auto_stop_machines = "off"`.

---

## Variables de entorno

Todas están en `.env.example` con comentarios. Las imprescindibles:

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Postgres (Neon en producción, con `?sslmode=require`) |
| `AUTH_SECRET` | secreto de sesión — genera uno **nuevo** con `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` detrás de proxy (Northflank, Caddy) |

Opcionales (cada bloque duerme sin sus claves):

| Grupo | Variables | Sin ellas |
|---|---|---|
| Fotos/audio en R2 | `S3_BUCKET`, `S3_REGION` (`auto`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | archivos en disco local (se pierden en cada deploy) |
| Llamadas (TURN) | `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | solo STUN (falla en CGNAT) |
| Push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | sin notificaciones |

---

## Ruta A — Northflank + Neon + R2 + Cloudflare (gratis)

### 1. Base de datos: Neon
1. Crea un proyecto en [neon.tech](https://neon.tech).
2. Copia la **cadena de conexión con pooler** (`...-pooler...`), añade
   `?sslmode=require` al final. Esa es tu `DATABASE_URL`.
3. No hace falta crear tablas: el contenedor aplica las migraciones al arrancar.

### 2. Fotos y audio: Cloudflare R2
1. En el dashboard de Cloudflare → **R2** → crea un bucket (p. ej. `near`).
2. **R2 → Manage API Tokens** → crea un token con permiso de lectura/escritura
   sobre ese bucket. Apunta `Access Key ID` y `Secret Access Key`.
3. Tu `S3_ENDPOINT` es `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
   `S3_REGION=auto`, `S3_BUCKET=near`.

### 3. Llamadas: Cloudflare Realtime TURN
1. Dashboard → **Realtime** → **TURN** → crea una TURN key.
2. Apunta el `Key ID` (`CF_TURN_KEY_ID`) y el `API Token` (`CF_TURN_API_TOKEN`).
   1.000 GB/mes gratis; las credenciales las genera el servidor solo.

### 4. Push (opcional pero recomendado)
```bash
npx web-push generate-vapid-keys
```
Copia la pública a `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, la privada a
`VAPID_PRIVATE_KEY`, y pon `VAPID_SUBJECT=mailto:tu-correo`.

### 5. La app: Northflank
1. Crea cuenta en [northflank.com](https://app.northflank.com) (login con GitHub)
   y un **proyecto** llamado `near` en la región europea.
2. **Create new → Service → Deployment** (no "Build"; queremos la imagen ya
   construida), origen **External image**:
   `ghcr.io/hrld1/near:latest` — la publica el CI en cada push a `main`. Hazla
   pública en GitHub → Packages y Northflank la detecta sin credenciales.
3. **Plan**: `nf-compute-10` (el gratuito del Sandbox). **Port**: `3000`, público
   y HTTP. **Health check**: HTTP `GET /api/health`.
4. Pega TODAS las variables de entorno de arriba.
5. Deploy. El arranque corre `prisma migrate deploy` y levanta el servidor.

El plan gratuito (Sandbox: 2 servicios + 1 base de datos) mantiene el contenedor
**siempre encendido**, que es justo lo que el bus SSE necesita. Northflank
advierte que el Sandbox no está pensado para producción seria: vale para el
piloto, y si Near crece se sube de plan sin tocar nada del despliegue.

### 6. Contenido inicial (una vez)
La app funciona pero sin preguntas del día ni quiz hasta sembrarlas. Desde tu
máquina, apuntando a la `DATABASE_URL` de Neon (sin la pareja demo):
```bash
SEED_DEMO=false npm run db:seed
```

### 7. Despliegue continuo (opcional)
Para que cada push a `main` redespliegue solo, en GitHub → Settings → Secrets
and variables → Actions:
- Secreto **`NORTHFLANK_API_KEY`** (Northflank → avatar → Account settings →
  API tokens; basta con el permiso **Update Deployment**).
- Variable **`NORTHFLANK_PROJECT`** con el ID del proyecto (p. ej. `near`).
- Variable **`NORTHFLANK_SERVICE`** con el ID del servicio (p. ej. `web`).

Los IDs son los del *slug* de la URL, no el nombre visible:
`app.northflank.com/s/<equipo>/projects/<PROJECT>/services/<SERVICE>`.

Sin ellos, el CI publica la imagen y no falla; redesplegar es un clic en
Northflank.

---

## Ruta B — VPS (plan B, todo en una caja)

Para un VPS propio (Oracle Cloud Always Free da 4 vCPU / 24 GB ARM gratis, o
cualquier VPS con Docker). Postgres, la app y TLS en la misma máquina.

`compose.prod.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: near
      POSTGRES_PASSWORD: pon-uno-fuerte
      POSTGRES_DB: near
    volumes: [near_pgdata:/var/lib/postgresql/data]

  web:
    image: ghcr.io/hrld1/near:latest
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://near:pon-uno-fuerte@db:5432/near
      AUTH_SECRET: genera-uno-con-openssl
      AUTH_TRUST_HOST: "true"
    depends_on: [db]
    volumes: [near_uploads:/app/uploads]   # persiste las fotos entre deploys

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [web]

volumes: { near_pgdata: {}, near_uploads: {}, caddy_data: {} }
```

`Caddyfile` (TLS automático de Let's Encrypt):
```
tu-dominio.com {
  reverse_proxy web:3000
}
```

Arranque: `docker compose -f compose.prod.yml up -d`. Sin R2, las fotos viven en
el volumen `near_uploads` (por eso se monta). Contenido inicial igual que la
ruta A, paso 6.

---

## Backups

`.github/workflows/backup.yml` hace una copia **semanal cifrada** a R2 (lunes
03:17 UTC; `pg_dump` → GPG AES-256 → R2, poda a los 60 días). Actívalo con estos
secretos en GitHub Actions: `DATABASE_URL`, `BACKUP_PASSPHRASE` (invéntala y
**guárdala tú**: sin ella no hay restauración), `S3_BUCKET`, `S3_ENDPOINT`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Lánzalo a mano la primera vez
(pestaña Actions → Backup → Run workflow).

Restaurar:
```bash
aws s3 cp s3://near/backups/near-AAAA-MM-DD.dump.gpg . --endpoint-url "$S3_ENDPOINT"
gpg -d near-AAAA-MM-DD.dump.gpg > near.dump
# Por Docker para no depender de la versión de pg_restore que tengas: debe ser
# igual o mayor que la del servidor (Neon corre 18), o se niega a restaurar.
docker run --rm -i -e PGURL="$DATABASE_URL" -v "$PWD:/w" -w /w postgres:18-alpine \
  sh -c 'pg_restore --clean --if-exists -d "$PGURL" near.dump'
```

---

## Verificación tras el estreno

```bash
curl https://tu-dominio/api/health        # {"ok":true,"db":"up",...}
BASE_URL=https://tu-dominio npm run test:e2e   # los 9 flujos contra producción
```
Además, a mano: instalar la PWA, push real entre dos móviles, y una llamada
con uno de los dos en datos móviles (fuerza el uso de TURN).

## Escalar

- **Crece** (decenas–cientos de parejas): sube el plan de cómputo de Northflank
  (de `nf-compute-10` al siguiente) y el de Neon. Cero cambios de código.
- **Multi-instancia** (miles): define `REDIS_URL` (Upstash) para repartir el bus
  entre procesos y arranca 2+ instancias. El adaptador ya existe.
