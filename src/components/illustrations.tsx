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
