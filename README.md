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
- **PWA + Web Push** (VAPID con `web-push`, sin servicios de terceros)
- **Spotify Connect** real y opcional (OAuth por usuario, gated por entorno)
- **Adaptadores de despliegue** sin dependencias obligatorias: almacenamiento S3 (firma SigV4 con el crypto de Node) y bus Redis, ambos por entorno
- **Vitest** para la logica pura (fechas/timezone, motor de engagement, juegos)
- **Prisma Migrate** con historial versionado en `prisma/migrations/`

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | no | Notificaciones push (genera las claves con `npx web-push generate-vapid-keys`). Sin ellas la app funciona igual, solo sin push |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | no | Enciende Spotify Connect real en la sala. Crea la app en developer.spotify.com y añade `.../api/spotify/callback` como Redirect URI. Sin ellas, se usa el companion honesto |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` (`S3_ENDPOINT`) | no | Guarda los archivos en S3 (o R2/MinIO con `S3_ENDPOINT`) en vez de disco local. Sin ellas, `./uploads` |
| `REDIS_URL` | no | Reparte los eventos en vivo entre instancias en despliegue multi-nodo (requiere `npm i ioredis`). Sin ella, bus en memoria |

## Que hay dentro

### Habito diario (motor de engagement)
- **Racha de pareja**: dias consecutivos en los que *ambos* entran. Se calcula sobre `ActivityDay`, el libro mayor de puntos: no hay contadores duplicados.
- **3 misiones diarias** rotativas (deterministas por fecha+pareja), verificadas contra datos reales (mood hecho, foto enviada, reto jugado...). Bonus reclamable al completarlas.
- **Temporada mensual** con niveles (Chispa → Supernova), puntos por persona y ranking interno de pareja.
- **11 logros** computados sobre datos reales y persistidos al desbloquear.
- **Caja diaria**: una por pareja y dia (reto, pregunta valiente, gesto o *flashback* de vuestros propios momentos). Quien la abre, la abre para los dos, en vivo.

### Arcade (rediseno completo)
- **Reto del dia**: un juego rotativo, 5 intentos, mejor marca contra tu pareja, ganador del dia e historial de duelos de la semana (G/P/E). **Ganar el duelo de ayer se cobra en /play (+15)** con re-verificacion en servidor.
- **9 minijuegos reales y animados**: Reflejos, Parejas, Dianas, Eco, Palabra oculta, Sprint (calculo), Teclas (mecanografia) y, en **canvas con fisica y particulas a 60fps**, **Minigolf** (5 hoyos con rebotes y apuntado tirachinas) y **Chapas** (deslizar a la diana con colisiones entre chapas). Registro declarativo en `lib/games.ts`: anadir un juego = 1 componente + 1 entrada.
- **4 en raya EN VIVO**: duelo por turnos en directo sobre el bus SSE (reto, fichas con caida animada, revancha). Sin persistencia: partida en vivo entre los dos.
- **Quiz "Nos conocemos?"** integrado como modo cooperativo.
- Puntuaciones persistidas (`GameScore`) con **rango plausible validado en servidor** (`scoreBounds`), puntos de temporada por participar y por ganar, confetti y feedback en cada resultado.

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

### Iteracion 4: correccion, calidad y PWA
- **Integridad del motor de puntos**: cada concepto puntua maximo una vez por dia (reeditar mood/pregunta o subir 12 fotos ya no farmea); scores de juegos acotados por `scoreBounds` en servidor.
- **Dos claves de dia con timezone real** (`src/lib/dates.ts`): el dia personal (mood, puntos) va en la zona del usuario; el dia compartido (caja, reto, pregunta, misiones, racha, temporada) en la de la pareja. Testeado con DST y husos extremos.
- **`duelWon` y `weeklyBonus` implementados**: reclamar duelo de ayer (+15) y semana perfecta 7/7 (+40 por persona), con claim idempotente.
- **Robustez**: error/loading boundaries en toda la app, skeletons en home y arcade, presencia con caducidad (4h/12h), logros recalculados fuera del render.
- **Calidad**: ESLint activo en build, `StreamEvent` como union discriminada, wrapper `coupleAction` para todas las actions, chat descompuesto en piezas, 43 tests de logica pura, migraciones Prisma versionadas.
- **PWA + push** (ver tabla de integraciones) y pagina de **Ajustes**.
- **Producto**: aniversario de pareja con contador de mesiversarios/aniversarios (home y fechas), "visto" en los "pensando en ti", eventos con hora de fin, titulo real del video en la sala (oEmbed), pools de la caja ampliados (25 retos / 20 preguntas / 15 gestos) y 2 minijuegos nuevos.

### Iteracion 5: llamada robusta y arcade inmersiva
- **Videollamada que no revienta**: si la camara esta en uso (el caso tipico al probar con dos navegadores en un mismo PC) se entra con solo-audio o como espectador (transceivers `recvonly`); errores especificos, guardas de negociacion y 7s de gracia ante cortes transitorios.
- **Juegos con gorra de videojuego movil**: mini-motor canvas propio (`games/engine.ts`: HiDPI, particulas, apuntado tirachinas) y dos juegos fisicos: **Minigolf** y **Chapas**. Dianas rediseñadas con anillos reales y ondas al acertar.
- **4 en raya en vivo**: primer juego cabeza-a-cabeza por turnos de Near, serializado por el bus SSE.

### Iteración 6: rituales de cercanía, presencia viva y despliegue
Catorce mejoras para que la app "se sienta" más cerca, en cuatro niveles:

**Rituales de contacto en vivo**
- **Beso de pulgar** (`/touch`): ambos apoyáis el dedo en la pantalla; sus posiciones viajan por el bus y, cuando coinciden, nace un latido (vibración en patrón de corazón + sonido grave sintetizado + resplandor que crece).
- **Llamada global**: la videollamada vive en un provider (`CallProvider`), así el audio sobrevive a la navegación; recibes la llamada en cualquier pantalla y hay tono de llamada, timbre háptico y reintentos de robustez.
- **Sonido y háptica**: efectos sintetizados con WebAudio (cero assets) y `navigator.vibrate`; opt-in con preferencias por dispositivo.
- **Presencia viva en el chat**: "está escribiendo…", "Visto" y un punto verde "en Near ahora" (transición de conexión SSE). El `EventSource` es un singleton con fan-out para no agotar conexiones del navegador.
- **Dormir juntos**: pantalla atenuada sobre la llamada con los dos relojes; "Buenas noches" cierra con un latido en ambos lados.

**Rituales lentos y de vínculo**
- **Foto del día** estilo Locket: mandas tu día como imagen; aparece en la home de tu pareja.
- **Cartas lentas** (`/letters`): escribes hoy y llega mañana a las 08:00 (en la zona del receptor), o una **cápsula del tiempo** a una fecha elegida. Entrega on-read idempotente (sin cron); el cuerpo no entregado nunca llega al cliente.
- **Recap mensual** (`/recap`): "vuestro mes en Near" dibujado sobre canvas y **exportable como imagen** (descargar o Web Share).
- **Mapa de la distancia** (`/map`): ciudades voluntarias (sin GPS), km reales, cuenta atrás a la próxima cita y **clima actual** de cada ciudad con **Open-Meteo** (sin API key), todo resuelto en cliente.

**Crear juntos**
- **Lienzo compartido** (`/canvas`): dibujáis a la vez, trazo a trazo por el bus (puntos normalizados 0..1); quien entra tarde recibe lo ya dibujado; se guarda en el álbum como un momento.
- **Spotify Connect real** (encendido por entorno): OAuth por usuario, refresco de token en servidor, el líder comparte lo que suena y el seguidor (Premium + dispositivo activo) lo reproduce a la vez. Sin claves, sigue el companion honesto.

**Onboarding y oficio**
- **Enlace `/join/[code]`** con Web Share y **espera productiva**: mientras la pareja acepta, puedes fijar la fecha, dejar una nota y escribir una carta de bienvenida (se guardan en `Invite.prep` y se aplican al vincular).
- **Español correcto y accesibilidad**: barrido de tildes/ñ/¿¡ por toda la interfaz, respeto de `prefers-reduced-motion` (sin confeti ni latidos para quien pide menos movimiento) y textos mínimos más legibles.
- **Adaptadores de despliegue**: almacenamiento **S3** y bus **Redis** por entorno (ver *Despliegue*), dormidos por defecto.

### Iteración 7: intuitiva para cualquiera
El norte fue que Near la entienda cualquiera (no solo un entusiasta) en 30 segundos.
- **Navegación de 5 destinos**: *Hoy*, *Chat*, *Juntos*, *Recuerdos* y *Ajustes* (dos verbos y dos sustantivos). Antes había 6-7 pestañas más 5 rutas huérfanas escondidas en la home. *Juntos* (`/juntos`) reúne ver juntos, lienzo y jugar; *Recuerdos* (`/recuerdos`) reúne álbum, cartas, fechas, mapa y el mes, con contexto real en cada tarjeta. El resaltado va por grupos de ruta y ninguna URL se borra (los push siguen vivos).
- **Home "Hoy" sin menú**: fuera la parrilla de accesos rápidos que duplicaba la barra; la home queda centrada en presencia + ritual del día.
- **Confianza como mensaje**: panel "Vuestro espacio, y de nadie más" en onboarding y en `/join` (honesto: no promete E2EE, sí acceso restringido a los dos).
- **Bug de onboarding corregido**: `/join/[code]` ahora es público en el middleware — quien recibe el enlace y aún no tiene cuenta ya no acababa en `/login`.

## Integraciones: reales vs pendientes

| Integracion | Estado | Detalle |
|---|---|---|
| YouTube sync | ✅ Real | IFrame API, sin claves |
| Videollamada | ✅ Real | WebRTC P2P + SSE signaling. TURN opcional (env) para NAT estricto. Si la camara esta ocupada (p.ej. dos navegadores en el mismo PC) degrada a solo-audio o espectador en vez de fallar |
| Netflix/HBO/Prime/Disney+ | ⚠️ Companion honesto | No existe API publica de control de reproduccion; Near coordina a las personas, no a los players |
| Spotify | ✅ Real (gated, v6) | Spotify Connect real, **encendido por entorno**: OAuth por usuario (`SPOTIFY_CLIENT_ID/SECRET`), refresco de token en servidor, el líder comparte lo que suena y el seguidor lo reproduce a la vez (necesita Premium + dispositivo activo). Sin claves queda dormido y sigue el companion honesto |
| Almacenamiento de archivos | ✅ Real, adaptable (v6) | Disco local por defecto; **S3** (o R2/MinIO) por entorno con firma SigV4 propia (sin dependencias). La URL `/api/files/...` y el control de acceso por pareja no cambian |
| Push notifications | ✅ Real (v4) | PWA instalable + Web Push (VAPID, sin terceros). Push solo si el otro esta offline: mensajes, latidos, caja del dia e invitacion aceptada. Opt-in por dispositivo en Ajustes. iOS: requiere 16.4+ y anadir a pantalla de inicio |
| E2EE del chat | ❌ Pendiente | Documentado honestamente; TLS + acceso restringido por pareja |
| Realtime multi-nodo | ✅ Adaptador Redis (v6) | Bus en memoria por defecto (perfecto dev/single-node). Con `REDIS_URL` (+ `npm i ioredis`), el puente `lib/bus-redis.ts` reparte los eventos entre instancias sin cambiar `publish/subscribe`. El seguimiento de "online" es local best-effort |

## Arquitectura

```
prisma/                 esquema (comentado) + seed
src/
  auth.ts               Auth.js: credentials + JWT + Prisma Adapter
  middleware.ts          guard ligero por cookie (edge-safe)
  app/(auth)/           login, registro
  app/(app)/            home, chat, moments, calendar, date-room, play, play/[gameKey], play/quiz,
                        touch, letters, recap, map, canvas, onboarding
  app/join/[code]/      onboarding por enlace (público, auto-canje al entrar)
  app/api/              auth, stream (SSE), upload, files (servido autenticado), spotify (OAuth)
  actions/              server actions por dominio (Zod + control de acceso por pareja)
  features/             componentes cliente por dominio (chat, home, dateroom, play/games, moments,
                        call, touch, letters, recap, map, canvas, onboarding)
  components/           UI base + layout + theme
  lib/
    engagement.ts       puntos, racha, misiones, temporada, logros
    games.ts            registro declarativo de minijuegos
    box.ts              contenido de la caja diaria
    realtime.ts         bus pub/sub en memoria + puente a otras instancias
    bus-redis.ts        puente Redis del bus (activo solo con REDIS_URL)
    storage.ts          almacenamiento de archivos: local por defecto, S3/R2/MinIO por entorno
    spotify.ts          Spotify Connect: OAuth, refresco de token y reproducción (gated)
    letters.ts          entrega on-read de cartas lentas y cápsulas
    recap.ts            resumen mensual de la pareja
    canvas-log.ts       registro en memoria del lienzo compartido (para quien entra tarde)
    image-client.ts     compresion de imagenes en cliente
    sound.ts            efectos WebAudio + háptica (sin assets)
```

Decisiones de modelado: `ActivityDay` como unica fuente de puntos (todo lo demas se deriva); countdowns derivados de eventos; notas de voz como `Message(kind: VOICE)`; la respuesta del otro (pregunta/quiz) solo se revela tras responder tu (filtrado en servidor); limite de intentos por juego/dia y rango plausible del score (`scoreBounds`) validados en servidor.

**Dos claves de dia con zona horaria real** (`src/lib/dates.ts`): lo personal (mood, puntos de `ActivityDay`) vive en el dia local del usuario (`User.timezone`); lo compartido-determinista (caja diaria, reto del dia, pregunta del dia, misiones, racha, temporada) vive en el dia de la pareja (`Couple.timezone`, fijada al vincular). Asi ambos ven la misma caja/reto aunque esten en husos distintos. Regla de integridad de puntos: cada concepto puntua como maximo una vez por dia (reeditar el mood o reenviar no vuelve a sumar).

## Privacidad y seguridad

Sin GPS ni presencia involuntaria (todo voluntario y editable). Adjuntos accesibles unicamente por los dos miembros. Contrasenas bcrypt (12). Validacion Zod en servidor en toda mutacion. La senalizacion de llamada solo se retransmite dentro de la pareja y no se persiste; el video/audio va P2P, no pasa por el servidor.

## Despliegue

Near corre en un solo proceso Node sin ninguna infraestructura externa más allá
de PostgreSQL. Todo lo demás es **opcional y se enciende por variables de
entorno**, dormido por defecto (fiel a la decisión de no atar el proyecto a
ningún servicio hasta decidir el despliegue).

**Single-node (por defecto).** Basta `DATABASE_URL` + `AUTH_SECRET`:

```bash
npm run build
npm run db:deploy     # aplica migraciones (sin seed) en producción
npm start
```

Los archivos van a `./uploads` (monta un volumen persistente) y el bus de
eventos en vivo vive en memoria del proceso. Perfecto para un contenedor o una
VM.

**Escalar a varias instancias.** El SSE necesita que un evento publicado en una
instancia llegue a las conexiones abiertas en las otras. Define `REDIS_URL` e
instala el cliente (`npm i ioredis`): el puente `lib/bus-redis.ts` se activa
solo y reparte los eventos entre nodos, sin tocar el código que llama a
`publish`. El seguimiento de "online" sigue siendo local (best-effort): como
mucho, un push de más a alguien conectado en otro nodo, algo inofensivo.

**Archivos en almacenamiento gestionado.** Con un sistema de ficheros efímero
(muchas plataformas serverless), define `S3_BUCKET` + `S3_REGION` +
`S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` (y `S3_ENDPOINT` para R2/MinIO). La
subida y la lectura pasan a S3 con firma SigV4 hecha con el `crypto` de Node
(sin añadir el SDK de AWS). La URL pública `/api/files/{coupleId}/{name}` y el
control de acceso por pareja no cambian: seguimos sirviendo los bytes por la app.

**Notificaciones, TURN y Spotify.** Push (VAPID), TURN para NAT estricto y
Spotify Connect se activan igualmente por entorno (ver tablas). Ninguno es
necesario para que la app funcione.

En resumen, el mismo build sube de "una VM con Postgres" a "varias instancias
con Redis y S3" cambiando solo variables de entorno.

## Scripts

`npm run dev` · `npm run build` / `npm start` · `npm test` · `npm run db:migrate` (dev) · `npm run db:deploy` · `npm run db:seed` · `npm run db:setup` · `npm run db:studio`
