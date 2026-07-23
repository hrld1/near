// Ilustraciones propias de Near (it33-audit): la auditoría encontró que no
// hay ni una sola pieza de arte en toda la app — todo son iconos de línea de
// Lucide sobre color plano, y eso pesa en la sensación de "esquemática".
// Estas son SVG hechos a mano, no iconos ampliados: trazo suelto, degradado
// en el rosa/ciruela de la marca, pensadas para un momento concreto cada
// una. Los tokens de color son los mismos --c-rose/--c-plum de globals.css,
// así que heredan el tema claro/oscuro solas.

// El frasco de aprecio, antes del primer aprecio: cristal casi vacío con una
// única mota de luz esperando compañía.
export function EmptyJarIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="jar-glass" x1="30" y1="30" x2="90" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--c-rose))" stopOpacity="0.16" />
          <stop offset="1" stopColor="rgb(var(--c-plum))" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* tapa */}
      <rect x="47" y="20" width="26" height="10" rx="3" fill="rgb(var(--c-plum))" opacity="0.55" />
      <rect x="44" y="27" width="32" height="7" rx="2.5" fill="rgb(var(--c-plum))" opacity="0.7" />
      {/* cuerpo del tarro */}
      <path
        d="M36 34 L34 96 Q34 106 44 106 L76 106 Q86 106 86 96 L84 34 Z"
        fill="url(#jar-glass)"
        stroke="rgb(var(--c-plum))"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      {/* brillo de cristal */}
      <path d="M42 40 L40 92" stroke="white" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      {/* una mota de luz sola, esperando */}
      <circle cx="60" cy="76" r="4.5" fill="rgb(var(--c-rose))" opacity="0.85" />
      <circle cx="60" cy="76" r="10" fill="rgb(var(--c-rose))" opacity="0.18" />
    </svg>
  );
}

// Buzón vacío, antes de la primera carta: un sobre cerrado con un corazón
// saliendo, para que "aún no hay cartas" se sienta como una invitación a
// escribir, no como un vacío. Mismo trazo y degradado que las demás.
export function LetterIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="env-fill" x1="30" y1="46" x2="90" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--c-rose))" stopOpacity="0.16" />
          <stop offset="1" stopColor="rgb(var(--c-plum))" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* cuerpo del sobre */}
      <rect
        x="26"
        y="50"
        width="68"
        height="44"
        rx="7"
        fill="url(#env-fill)"
        stroke="rgb(var(--c-plum))"
        strokeOpacity="0.5"
        strokeWidth="2.5"
      />
      {/* la solapa */}
      <path
        d="M28 53 L60 76 L92 53"
        fill="none"
        stroke="rgb(var(--c-plum))"
        strokeOpacity="0.5"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* el corazón que sale: lo que la carta lleva dentro */}
      <circle cx="60" cy="34" r="14" fill="rgb(var(--c-rose))" opacity="0.14" />
      <path
        d="M60 48 C 54 41, 45 37, 45 30 C 45 25.5, 48.5 23, 52.5 23 C 56 23, 58.5 25.5, 60 28 C 61.5 25.5, 64 23, 67.5 23 C 71.5 23, 75 25.5, 75 30 C 75 37, 66 41, 60 48 Z"
        fill="rgb(var(--c-rose))"
        opacity="0.85"
      />
    </svg>
  );
}

// Álbum vacío, antes de la primera foto: una polaroid ligeramente ladeada con
// un corazón dentro, como una instantánea recién sacada esperando compañía.
export function AlbumIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="album-fill" x1="39" y1="34" x2="81" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--c-rose))" stopOpacity="0.28" />
          <stop offset="1" stopColor="rgb(var(--c-plum))" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 60 62)">
        {/* el papel de la polaroid */}
        <rect
          x="33"
          y="28"
          width="54"
          height="66"
          rx="4"
          fill="rgb(var(--c-paper))"
          stroke="rgb(var(--c-plum))"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        {/* la ventana de la foto */}
        <rect x="39" y="34" width="42" height="40" rx="2" fill="url(#album-fill)" />
        {/* el corazón dentro: lo que guarda el álbum */}
        <path
          d="M60 62 C 55 57, 49 54, 49 49 C 49 46, 51 44, 54 44 C 56.5 44, 58.5 45.5, 60 47.5 C 61.5 45.5, 63.5 44, 66 44 C 69 44, 71 46, 71 49 C 71 54, 65 57, 60 62 Z"
          fill="rgb(var(--c-rose))"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}

// Chat vacío, antes del primer mensaje: dos burbujas que se solapan —una de
// cada uno— con un corazón dentro. "Empieza la conversación" como algo que se
// hace entre dos, no un icono de mensaje suelto.
export function ChatIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="chat-fill" x1="44" y1="50" x2="90" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--c-rose))" stopOpacity="0.22" />
          <stop offset="1" stopColor="rgb(var(--c-rose-deep))" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {/* burbuja de atrás (ciruela) */}
      <path
        d="M30 32 h40 a11 11 0 0 1 11 11 v14 a11 11 0 0 1 -11 11 h-24 l-9 9 v-9 h-7 a11 11 0 0 1 -11 -11 v-14 a11 11 0 0 1 11 -11 z"
        fill="rgb(var(--c-plum) / 0.12)"
        stroke="rgb(var(--c-plum))"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* burbuja de delante (rosa) con el corazón */}
      <path
        d="M62 54 h24 a10 10 0 0 1 10 10 v12 a10 10 0 0 1 -10 10 h-6 v8 l-9 -8 h-9 a10 10 0 0 1 -10 -10 v-12 a10 10 0 0 1 10 -10 z"
        fill="url(#chat-fill)"
        stroke="rgb(var(--c-rose))"
        strokeOpacity="0.7"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M74 78 C 70 74, 65 72, 65 68 C 65 65.5, 67 64, 69.5 64 C 71.5 64, 73 65, 74 66.5 C 75 65, 76.5 64, 78.5 64 C 81 64, 83 65.5, 83 68 C 83 72, 78 74, 74 78 Z"
        fill="rgb(var(--c-rose))"
        opacity="0.85"
      />
    </svg>
  );
}

// Calendario sin fechas por venir: una hoja de calendario con el día señalado
// por un corazón. Para que "aún no hay fechas" invite a marcar un reencuentro.
export function CalendarIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cal-head" x1="30" y1="30" x2="90" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--c-rose))" />
          <stop offset="1" stopColor="rgb(var(--c-plum))" />
        </linearGradient>
      </defs>
      {/* anillas */}
      <rect x="43" y="24" width="4" height="14" rx="2" fill="rgb(var(--c-plum))" opacity="0.6" />
      <rect x="73" y="24" width="4" height="14" rx="2" fill="rgb(var(--c-plum))" opacity="0.6" />
      {/* cuerpo */}
      <rect
        x="28"
        y="32"
        width="64"
        height="58"
        rx="9"
        fill="rgb(var(--c-paper))"
        stroke="rgb(var(--c-plum))"
        strokeOpacity="0.4"
        strokeWidth="2.5"
      />
      {/* cabecera de color */}
      <path d="M28 41 a9 9 0 0 1 9 -9 h46 a9 9 0 0 1 9 9 v4 h-64 z" fill="url(#cal-head)" opacity="0.9" />
      {/* días */}
      <g fill="rgb(var(--c-plum))" opacity="0.3">
        <circle cx="40" cy="56" r="2.4" />
        <circle cx="52" cy="56" r="2.4" />
        <circle cx="64" cy="56" r="2.4" />
        <circle cx="76" cy="56" r="2.4" />
        <circle cx="40" cy="70" r="2.4" />
        <circle cx="76" cy="70" r="2.4" />
      </g>
      {/* el día marcado */}
      <path
        d="M60 78 C 55 73, 50 70.5, 50 66 C 50 63, 52 61, 55 61 C 57.5 61, 59 62.5, 60 64 C 61 62.5, 62.5 61, 65 61 C 68 61, 70 63, 70 66 C 70 70.5, 65 73, 60 78 Z"
        fill="rgb(var(--c-rose))"
        opacity="0.9"
      />
    </svg>
  );
}

// Racha en cero: una llama apagada, dibujada con el mismo trazo que el icono
// Flame de la cabecera — para que el primer día se sienta como un inicio, no
// como un hueco vacío.
export function UnlitStreakIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ember-fill" x1="30" y1="20" x2="66" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(var(--c-rose))" stopOpacity="0.22" />
          <stop offset="1" stopColor="rgb(var(--c-plum))" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <path
        d="M48 14 C63 34 70 48 70 61 C70 76 60 87 48 87 C36 87 26 76 26 61 C26 47 34 34 48 14 Z"
        fill="url(#ember-fill)"
        stroke="rgb(var(--c-plum))"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* núcleo, apagado pero con forma de llama — esperando la chispa */}
      <path
        d="M50 36 C57 46 60 53 60 60 C60 68 56 73 50 73 C44 73 40 68 40 61 C40 54 44 47 50 36 Z"
        fill="rgb(var(--c-rose))"
        opacity="0.3"
      />
    </svg>
  );
}
