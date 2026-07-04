# Near

Un hogar digital privado para parejas a distancia: chat, presencia emocional, album compartido, calendario con countdowns, sala para ver cosas juntos con videollamada, y una arcade diaria que genera habito. Todo para exactamente dos personas. Sin feed, sin seguidores, sin terceros.

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Tailwind CSS** con tokens CSS (paleta calida, dark mode completo)
- **Prisma ORM** + **PostgreSQL**
- **Auth.js (NextAuth v5)** con Prisma Adapter, credentials + bcrypt
- **Zod** en todas las server actions
- **SSE** para tiempo real (chat, presencia, juegos, sync de sala y **senalizacion WebRTC**)
- **WebRTC** para videollamada P2P (STUN publico; TURN opcional)
- **YouTube IFrame API** para reproduccion sincronizada real

## Puesta en marcha

Requisitos: Node 18+, Docker (o PostgreSQL propio).

```bash
docker compose up -d          # 1. PostgreSQL
cp .env.example .env          # 2. edita AUTH_SECRET (openssl rand -base64 32)
npm install                   # 3. dependencias + prisma generate
npm run db:setup              # 4. migraciones + seed (prompts, quiz, pareja demo)
npm run dev                   # 5. http://localhost:3000
```

> **Desde la iteracion 4 el esquema evoluciona con migraciones** (`prisma migrate`), no con `db push`: hay historial en `prisma/migrations/` y los despliegues son reproducibles (`npm run db:deploy`). Si vienes de una BD anterior a la iteracion 4, con la BD al dia basta marcar el baseline: `npx prisma migrate resolve --applied 0_init` y despues `npm run db:deploy`.

**Pareja demo**: `ana@near.demo` y `leo@near.demo`, contrasena `neardemo123`. Abre dos navegadores (uno incognito) para probar chat, duelos y videollamada en tiempo real.

### Variables de entorno

| Variable | Obligatoria | Descripcion |
|---|---|---|
| `DATABASE_URL` | si | PostgreSQL (`postgresql://near:near@localhost:5432/near` con el docker-compose) |
| `AUTH_SECRET` | si | Firma de sesiones |
| `AUTH_TRUST_HOST` | dev | `true` en desarrollo |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | no | TURN para videollamada tras NAT estricto (CGNAT, wifi de universidad). Sin ello, STUN publico funciona en la mayoria de redes domesticas |

## Que hay dentro

### Habito diario (motor de engagement)
- **Racha de pareja**: dias consecutivos en los que *ambos* entran. Se calcula sobre `ActivityDay`, el libro mayor de puntos: no hay contadores duplicados.
- **3 misiones diarias** rotativas (deterministas por fecha+pareja), verificadas contra datos reales (mood hecho, foto enviada, reto jugado...). Bonus reclamable al completarlas.
- **Temporada mensual** con niveles (Chispa → Supernova), puntos por persona y ranking interno de pareja.
- **11 logros** computados sobre datos reales y persistidos al desbloquear.
- **Caja diaria**: una por pareja y dia (reto, pregunta valiente, gesto o *flashback* de vuestros propios momentos). Quien la abre, la abre para los dos, en vivo.

### Arcade (rediseno completo)
- **Reto del dia**: un juego rotativo, 5 intentos, mejor marca contra tu pareja, ganador del dia e historial de duelos de la semana (G/P/E).
- **5 minijuegos reales y animados**: Reflejos (reaction), Parejas (memory), Dianas (aim), Eco (Simon) y Palabra oculta (anagramas del dia). Registro declarativo en `lib/games.ts`: anadir un juego = 1 componente + 1 entrada.
- **Quiz "Nos conocemos?"** integrado como modo cooperativo.
- Puntuaciones persistidas (`GameScore`), puntos de temporada por participar y por ganar, confetti y feedback en cada resultado.

### Album compartido
- Pestanas **Album** (grid) y **Diario** (timeline por meses).
- **Subida multiple** con **compresion real en cliente** (reescalado a 1600px + JPEG antes de subir).
- **Favoritos por persona, comentarios, etiquetas con filtro y "momento especial"** (destacado).
- Adjuntos servidos solo a los dos miembros por ruta autenticada.

### Date Room
- **Videollamada WebRTC real**: P2P, senalizada por el bus SSE existente (cero infra extra), con mute/camara/duracion. STUN publico; TURN opcional documentado.
- **Ver juntos**: YouTube sincronizado (play/pausa/seek con correccion de deriva).
- **Modo companion honesto** para Netflix/HBO/Prime/Disney+/Spotify: sus APIs **no permiten** controlar la reproduccion desde una web externa y Near no lo finge. Lo real: fijar plan compartido, "estoy lista/o", cuenta atras 3-2-1 sincronizada y senales de pausa/reanudar en vivo.
- Chat propio de la sala.

### Chat
- Tiempo real por SSE, **paginacion** ("ver mensajes anteriores" con scroll preservado), **no leidos** con badge en la navegacion, imagenes, **notas de voz reales**, reacciones, envio optimista.

### Sistema visual (v3)
- Iconografia unica con lucide en todo el chrome de UI (juegos, eventos, niveles, logros): los emojis quedan reservados a contenido expresivo (reacciones, moods, mensajes).
- Identidad propia por minijuego (icono + acento + gradiente), duelo diario en formato VS.
- Chat con agrupacion de mensajes, avatares, estados de envio, lightbox y composer unificado; header con presencia, mood, hora local, racha y proxima fecha.
- Home como dashboard emocional: hero (tu pareja + countdown) y jerarquia real entre modulos.
- Fechas con countdown destacado y timeline; album con strip de especiales y grid editorial; dark mode en todo.

### Otros cierres de la v2
- **Dark mode completo** (tokens CSS + toggle + sin flash al cargar).
- **Zona horaria real**: se detecta y guarda automaticamente; la home muestra **la hora local de tu pareja**.
- Presencia, mood check, pregunta del dia, notas destacadas, "pensando en ti" con toast: igual que v1, ahora sumando puntos y racha.

## Integraciones: reales vs pendientes

| Integracion | Estado | Detalle |
|---|---|---|
| YouTube sync | ✅ Real | IFrame API, sin claves |
| Videollamada | ✅ Real | WebRTC P2P + SSE signaling. TURN opcional (env) para NAT estricto |
| Netflix/HBO/Prime/Disney+ | ⚠️ Companion honesto | No existe API publica de control de reproduccion; Near coordina a las personas, no a los players |
| Spotify | ❌ Pendiente | El sync real exige crear una app en developer.spotify.com (Client ID/Secret), OAuth con scopes `user-read-playback-state`/`user-modify-playback-state` y **cuentas Premium**. El companion actual ya cubre "escuchar a la vez". Si quieres que lo implemente: crea la app, anade `SPOTIFY_CLIENT_ID/SECRET` al `.env` y pidemelo |
| Push notifications | ❌ Pendiente | Requiere claves VAPID (`npx web-push generate-vapid-keys`) + service worker. Los no-leidos in-app ya funcionan |
| E2EE del chat | ❌ Pendiente | Documentado honestamente; TLS + acceso restringido por pareja |
| Realtime multi-nodo | ⚠️ Interfaz lista | Bus en memoria (perfecto dev/single-node). Para varias instancias: sustituir `lib/realtime.ts` por Redis pub/sub manteniendo `publish/subscribe` |

## Arquitectura

```
prisma/                 esquema (comentado) + seed
src/
  auth.ts               Auth.js: credentials + JWT + Prisma Adapter
  middleware.ts          guard ligero por cookie (edge-safe)
  app/(auth)/           login, registro
  app/(app)/            home, chat, moments, calendar, date-room, play, play/[gameKey], play/quiz, onboarding
  app/api/              auth, stream (SSE), upload, files (servido autenticado)
  actions/              server actions por dominio (Zod + control de acceso por pareja)
  features/             componentes cliente por dominio (chat, home, dateroom, play/games, moments)
  components/           UI base + layout + theme
  lib/
    engagement.ts       puntos, racha, misiones, temporada, logros
    games.ts            registro declarativo de minijuegos
    box.ts              contenido de la caja diaria
    realtime.ts         bus pub/sub (swappable por Redis)
    image-client.ts     compresion de imagenes en cliente
```

Decisiones de modelado: `ActivityDay` como unica fuente de puntos (todo lo demas se deriva); countdowns derivados de eventos; notas de voz como `Message(kind: VOICE)`; la respuesta del otro (pregunta/quiz) solo se revela tras responder tu (filtrado en servidor); limite de intentos por juego/dia y rango plausible del score (`scoreBounds`) validados en servidor.

**Dos claves de dia con zona horaria real** (`src/lib/dates.ts`): lo personal (mood, puntos de `ActivityDay`) vive en el dia local del usuario (`User.timezone`); lo compartido-determinista (caja diaria, reto del dia, pregunta del dia, misiones, racha, temporada) vive en el dia de la pareja (`Couple.timezone`, fijada al vincular). Asi ambos ven la misma caja/reto aunque esten en husos distintos. Regla de integridad de puntos: cada concepto puntua como maximo una vez por dia (reeditar el mood o reenviar no vuelve a sumar).

## Privacidad y seguridad

Sin GPS ni presencia involuntaria (todo voluntario y editable). Adjuntos accesibles unicamente por los dos miembros. Contrasenas bcrypt (12). Validacion Zod en servidor en toda mutacion. La senalizacion de llamada solo se retransmite dentro de la pareja y no se persiste; el video/audio va P2P, no pasa por el servidor.

## Scripts

`npm run dev` · `npm run build` / `npm start` · `npm test` · `npm run db:migrate` (dev) · `npm run db:deploy` · `npm run db:seed` · `npm run db:setup` · `npm run db:studio`
