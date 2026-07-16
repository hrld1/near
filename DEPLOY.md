# Desplegar Near

Guía para poner Near en internet. La **ruta A (Koyeb + Neon + R2 + Cloudflare)**
es gratis y la recomendada para el piloto. La **ruta B (VPS)** lo mete todo en
una máquina tuya y queda documentada como plan B.

> Requisito que manda todo lo demás: el bus de eventos en vivo (SSE, presencia,
> carreras 1v1) vive **en memoria**. Near necesita **un proceso siempre
> encendido** — nada de serverless, nada de plataformas que hibernan.

---

## Variables de entorno

Todas están en `.env.example` con comentarios. Las imprescindibles:

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Postgres (Neon en producción, con `?sslmode=require`) |
| `AUTH_SECRET` | secreto de sesión — genera uno **nuevo** con `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` detrás de proxy (Koyeb, Caddy) |

Opcionales (cada bloque duerme sin sus claves):

| Grupo | Variables | Sin ellas |
|---|---|---|
| Fotos/audio en R2 | `S3_BUCKET`, `S3_REGION` (`auto`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | archivos en disco local (se pierden en cada deploy) |
| Llamadas (TURN) | `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | solo STUN (falla en CGNAT) |
| Push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | sin notificaciones |

---

## Ruta A — Koyeb + Neon + R2 + Cloudflare (gratis)

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

### 5. La app: Koyeb
1. Crea cuenta en [koyeb.com](https://app.koyeb.com) (login con GitHub).
2. **Create Web Service → Docker image**:
   `ghcr.io/hrld1/near:latest` (la publica el CI en cada push a `main`; hazlo
   público en GitHub → Packages, o añade credenciales de registro en Koyeb).
3. **Instance**: Free. **Port**: `3000`. **Health check**: HTTP `GET /api/health`.
4. Pega TODAS las variables de entorno de arriba.
5. Deploy. El arranque corre `prisma migrate deploy` y levanta el servidor.

### 6. Contenido inicial (una vez)
La app funciona pero sin preguntas del día ni quiz hasta sembrarlas. Desde tu
máquina, apuntando a la `DATABASE_URL` de Neon (sin la pareja demo):
```bash
SEED_DEMO=false npm run db:seed
```

### 7. Despliegue continuo (opcional)
Para que cada push a `main` redespliegue solo, en GitHub → Settings → Secrets
and variables → Actions:
- Secreto **`KOYEB_API_TOKEN`** (Koyeb → Account → API).
- Variable **`KOYEB_SERVICE`** con el formato `app/servicio` (p. ej. `near/web`).

Sin ellos, el CI publica la imagen y no falla; redesplegar es un clic en Koyeb.

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
pg_restore --clean --if-exists -d "$DATABASE_URL" near.dump
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

- **Crece** (decenas–cientos de parejas): sube la instancia de Koyeb a 1 GB y el
  plan de Neon. Cero cambios de código.
- **Multi-instancia** (miles): define `REDIS_URL` (Upstash) para repartir el bus
  entre procesos y arranca 2+ instancias. El adaptador ya existe.
