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

### Iteración 20: "Duelo en vivo" — modo 1v1 para los juegos de puntuación
Los juegos de marcador ganan un modo cara a cara en directo (como Plato), con un **único arnés reutilizable** en vez de reescribir cada juego.
- **Arnés de carrera** (`features/play/race/`): evento genérico `race:signal` + acción de relay + hook `useRace` + sala con **cuenta atrás 3·2·1** y **barra "vs"** que muestra el marcador del rival en tiempo real. Ambos juegan la MISMA prueba a la vez; al terminar los dos, se compara según la dirección del juego y hay revancha.
- **Contrato mínimo por juego**: cada juego reporta su marcador con un `onProgress(score)` opcional (una línea junto al `setScore`). Un único `ArcadeGameView` mapea clave→componente y lo comparten la arcade en solitario y la sala de duelo.
- **Lote 1 habilitado** (marcador continuo): Meteoros, Esquí, Rompemuros, A las nubes, Pinball, Dianas, Sprint y Teclas. Botón "Retar en vivo" en la página de cada juego habilitado (`/play/[gameKey]/vs`).
- Verificado con captura headless (barra vs + cuenta atrás). Nota: como los duelos de tablero, el flujo real de dos jugadores conviene probarlo a mano. Pendiente: cablear el resto (Reflejos, Parejas, Eco, Palabra oculta, Minigolf, Chapas) y, como mejora de justicia, misma semilla exacta por juego.

### Iteración 19: "Pinball" — físicas de máquina
- **Pinball**: mesa neón en canvas con paredes en embudo, cinco bumpers que rebotan y suman, y dos **flippers** que golpean la bola con el impulso real de su giro (la velocidad del punto de contacto sale de la velocidad angular). Colisión bola-segmento por punto más cercano con restitución y *substeps* para no atravesar nada. **Multitáctil**: tocas la mitad izquierda o derecha (o las dos) para cada flipper. 3 bolas, drenaje por el centro, best-score. Verificado con captura headless.
- Con esto la arcade solo llega a **14 juegos**.

### Iteración 18: dos arcades de acción más — "Rompemuros" y "A las nubes"
Más juegos dinámicos con física.
- **Rompemuros (Breakout)**: pala que sigue el dedo, bola con rebotes y ladrillos por **mapas** (uno con forma de corazón, damero, reloj de arena…). Al romper un ladrillo puede caer un **power-up** (pala ancha, multibola, cámara lenta); limpiar el mapa sube de nivel y acelera. 3 vidas, best-score.
- **A las nubes (climber)**: saltador infinito estilo *doodle jump* — el personaje rebota solo y lo diriges con el dedo mientras la cámara sube; puntúas la altura. Plataformas móviles, frágiles (se rompen) y con muelle (te lanzan). Caer por abajo, se acaba.
- Ambos verificados con captura headless. La arcade solo llega a **13 juegos**.

### Iteración 17: juegos más dinámicos — minigolf con mapas y "Esquí"
Menos tablero, más acción. Dos entregas de arcade con física.
- **Minigolf 2.0 — mapas de verdad**: de 5 hoyos con solo paredes a **9 mapas** con tipos de obstáculo nuevos: **agua** (splash → vuelves al punto de tiro y +1 golpe), **arena** (frena la bola), **hielo** (resbala), **bumpers** (círculos que la patean con fuerza) y una **compuerta que se mueve** y hay que cronometrar. Cada hoyo con nombre y algunos con césped tematizado.
- **"Esquí" (nuevo)**: bajada infinita en canvas. El esquiador sigue el dedo mientras árboles y rocas suben hacia él **cada vez más rápido**; cruzar las **puertas de eslalon** encadena combo. Un choque y se acaba: puntúas los metros. Spray de nieve, parallax de copos, *screen-shake* al chocar. Best-score, entra en el sistema de duelos diarios.
- Ambos verificados con captura headless. El minigolf pasa a `scoreBounds` 9–99 (9 hoyos).

### Iteración 16: "Cara a cara" — la colección de duelos 1v1 (como Plato)
Near tenía solo dos juegos en vivo (4 en raya, Hundir la flota). Para que se juegue *juntos* de verdad, esta iteración monta un arnés reutilizable y suma tres clásicos por turnos de golpe.
- **Arnés de duelos** (`features/play/duel/`): un único evento genérico `duel:signal` + acción de relay + hook `useDuel` + marco visual compartido encapsulan TODO el ciclo de vida 1v1 (lobby, invitar, aceptar, turnos, revancha, abandono) que antes se copiaba a mano. Añadir un juego nuevo = solo su **lógica pura** + su **tablero**. Ambos clientes aplican el mismo reducer determinista sobre el bus SSE, así que los dos tableros avanzan igual.
- **5 en raya (Gomoku)** 12×12: alinea cinco. Tablero estilo goban, racha ganadora resaltada.
- **Reversi (Othello)** 8×8: encierra y voltea; fichas con **volteo 3D real**, pistas de jugada legal, paso de turno automático y fin por conteo.
- **Puntos y cajas** 5×5: cierra cajas para robar turno; aristas y cajas con la inicial de cada uno.
- Nueva sección **"Cara a cara · en vivo"** en la arcade con los cinco duelos, destacada arriba. Cada juego con lógica pura testeada (13 tests nuevos) y tablero verificado con captura headless.

> El 4 en raya y Hundir la flota conservan su propio evento/acción (nacieron antes del arnés y funcionan; no se migran para no arriesgar). Hundir la flota además no encaja en el modelo "ambos computan la jugada" por su información oculta.

### Iteración 15: Sprint y Teclas suben al nivel arcade
Los dos juegos que quedaban "simples" (de escritura, difíciles de volver arcade) pasan a lienzo con juice.
- **Sprint** reconstruido: de botones DOM a **canvas neón** — la operación flota con brillo, las cuatro respuestas son orbes con degradado que se pulsan al tocar, aciertos encadenan **COMBO** (partículas y color en aumento), fallar **sacude la pantalla** y marca en verde la correcta. Barra de tiempo y HUD dibujados en el lienzo.
- **Teclas** reconstruido: **escenario en canvas** con la palabra como teclas que se **encienden letra a letra** según tecleas (la letra actual pulsa con contorno), estallido al completarla y COMBO. Mantiene un `<input>` real con estilo neón debajo — el teclado (sobre todo en móvil) lo necesita.
- **Mismo scoring** que antes en ambos (Sprint +1/−1 en 30 s, Teclas +1 por palabra en 45 s): el combo es solo vistoso, así las puntuaciones siguen siendo comparables con el histórico y los duelos. Verificados con captura headless.

> Con esto, **toda la arcade** está al nuevo nivel visual (Meteoros, Reflejos, Eco, Parejas, Sprint, Teclas). Siguiente frente posible: más 1v1 en vivo, o el álbum con auto-etiquetado.

### Iteración 14: "Hundir la flota" — el primer 1v1 en vivo
El primer juego que se juega **el uno contra el otro en tiempo real**, no cada uno por su lado contra el reloj.
- **Duelo por turnos sobre el bus SSE**: tablero 8×8, flota de 4 barcos (11 celdas) colocada al azar sin solapes. Se reta a la pareja (con push si está desconectada), se acepta y a jugar. Acierto → repites; fallo → pasa turno; gana quien hunde toda la flota rival. Confeti al ganar y **revancha** en un toque.
- **Diseño latencia-tolerante**: el defensor resuelve cada disparo (tocado/agua/hundido) y devuelve el resultado; nadie confía en el otro cliente para su propio estado. Mismo patrón de *relay* que Conecta 4, sin física en tiempo real (imposible fiable sobre SSE sin WebRTC).
- **Acabado de videojuego**: agua con degradado y sombra interior, barcos con textura metálica, 💥/🔥 con *pop-in* al impactar, ✖ al hundir, punto de estela al fallar.
- Lógica pura (`lib/battleship.ts`) con tests; **algoritmo del duelo verificado con 400 partidas simuladas** (todas terminan con un único ganador); tablero verificado con captura headless.

### Iteración 13: más juegos al nuevo nivel
- **Eco** reconstruido: de pads DOM a un **Simon neón en canvas** — pads con degradado y glow que se encienden con brillo y **tono propio** (do-mi-sol-do), partículas al acertar, sacudida al fallar.
- **Parejas** reconstruido: cartas con **volteo 3D real**, dorso con degradado rosa→plum y corazón, anillo verde + destello al emparejar, sonido por giro.
- Ambos conservan su scoring. Verificados con captura headless.

> Quedan por subir al nivel: Sprint y Teclas (más difíciles de "arcade" por ser de escritura); y sigue pendiente valorar un 1v1 en vivo (mejor por turnos/reveal, no físico en tiempo real: el bus SSE añade latencia).

### Iteración 12: arcade con gráficos de videojuego
Empezar a subir el listón visual de los minijuegos (los simples eran poco inmersivos).
- **Meteoros** (nuevo, insignia): arcade espacial en canvas — nave que sigue el dedo con estela de propulsor, asteroides irregulares con cráteres que rotan, orbes con brillo y combo, nebulosa con parallax de estrellas, partículas, explosiones y *screen shake*. Best-score, entra en el sistema de duelos.
- **Reflejos, reconstruido**: de un botón que cambiaba de color a un reactor en canvas que respira en calma y estalla en verde con ondas al armarse; partículas y lectura grande de ms. Mismo scoring.
- Reutiliza `games/engine.ts` (HiDPI, partículas). Verificados con captura headless.

> Siguiente en juegos: rebuild del resto de los simples (Eco, Sprint, Teclas, Parejas) a este nivel, y valorar un juego 1v1 en vivo estilo Plato.

### Iteración 11: el lienzo — de roto a juego
- **Arreglado**: el lienzo no dibujaba (dependía de un `requestAnimationFrame` diferido). Reescrito como `DrawSurface` reutilizable con **dibujo incremental** (cada trazo aparece al instante), DPR correcto y coords normalizadas. Verificado con captura headless.
- **Dibujad a la vez**: la misma palabra para los dos, a ciegas y contrarreloj (60 s); al acabar se revelan los dos dibujos y cada uno guarda el suyo en el álbum.
- **Dibuja y adivina**: quien dibuja tiene una palabra secreta y sus trazos viajan en vivo por SSE; quien adivina escribe; la validación la hace quien dibuja (la palabra no se filtra al cliente que adivina); al acertar, celebración y cambio de rol.
- `CanvasRoom` con selector de modo que **arrastra a tu pareja** al reto (si te retan desde otra pestaña, entras con la ronda ya empezada). Palabras y aciertos en `lib/draw-words.ts` (normalización sin tildes, testeada).

> Nota del apunte "la foto del día se subió también para Leo": no es un bug. En un mismo navegador solo hay **una** sesión; al entrar como Leo reemplazas la de Ana. Verificado en BD: solo existía la foto de Ana. Para probar dos usuarios: dos navegadores, o uno normal + uno de incógnito.

### Iteración 10: confianza y madurez — "vuestro, y podéis iros con dignidad"
Para pedirle a una pareja que vuelque su intimidad, tienen que poder salir con cariño y llevarse (o borrar) lo suyo. Antes no existía nada de esto.
- **Exportar** (`/api/export`, por sesión y pareja): descarga un JSON con **todo lo vuestro** (mensajes, momentos, cartas, fechas, notas, moods, fotos, quiz, scores…). La red de seguridad que hace que borrar no dé miedo.
- **Desvincularse / borrar cuenta** (Ajustes → *Zona delicada*): disolver el espacio **borra lo compartido para los dos** (modelo honesto de ruptura: nadie se queda con la intimidad del otro), y borrar la cuenta te elimina y disuelve el espacio. Confirmación escrita + recordatorio de exportar. Apoyado en el borrado en cascada del `Couple` + limpieza best-effort de archivos.
- **Contraseña y recuperación sin email**: cambiar la contraseña desde dentro, y —lo diferencial— **recuperación asistida por la pareja**: quien comparte tu espacio te genera un enlace de un solo uso (1 h) para volver a entrar en `/recover`. Sin infraestructura de correo; reutiliza `VerificationToken`.

### Iteración 9: "El momento de hoy" — el ritual diario recíproco
Darle a Near una espina: un único gesto diario, recíproco, que hace que abrir la app cada día sea inevitable.
- **El momento de hoy** (corazón de *Hoy*): cada día un **tema compartido** (`lib/moment-of-day.ts`, determinista por día de pareja, testeado) al que **los dos** respondéis con una foto y unas palabras.
- **Revelación recíproca**: ves el momento de tu pareja **solo después de compartir el tuyo**. Si va por delante, te lo dice ("ya ha compartido el suyo") sin enseñarlo — esa reciprocidad es el gancho.
- **Racha** de días seguidos en que los dos lo hacéis (reutiliza `computeStreak`), y **aviso** cuando tu pareja completa el suyo (push existente de la foto del día).
- Reutiliza el modelo/acción/push de la foto del día — **sin cambios de esquema**. Sustituye la vieja tarjeta "La foto de hoy" y la eleva a hero.

### Iteración 8: "Estar juntos" — cercanía ambiental
Convertir la cercanía de *acción* en *estado*: una pantalla que puedes dejar abierta y que respira con la vida de tu pareja, sin que tengas que hacer nada.
- **La ventana a su mundo** (`/together`): un **cielo dinámico** a pantalla completa según la hora local de la pareja (amanece / día / atardece / noche, con sol o luna en su arco y estrellas de noche — `lib/sky.ts`, puro y testeado). Su hora grande + tu hora discreta, avatar latiendo, presencia viva (en Near / estado / ánimo del día) y su **clima** (Open-Meteo, `lib/weather.ts`). Todo en vivo.
- **Co-presencia**: cuando los dos tenéis la ventana abierta, aparece *"está mirando el mismo cielo, ahora"* (señal efímera `together:here` por el bus SSE). Es la magia ambiental: sentir que coincidís sin decir nada.
- **Acercarte de un toque**: Latido, Tacto y Llamar desde la propia ventana, reutilizando el nudge, el beso de pulgar y el motor de llamada global.
- **Modo mesita**: Wake Lock para que la pantalla no se apague; respeta `prefers-reduced-motion`.
- Entradas desde el hero de la home y el hub *Juntos* (sin añadir un 6º destino a la barra).

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
