import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-sand/70 bg-paper p-5 shadow-card", className)}
      {...props}
    />
  );
}

// Título real de tarjeta (it36). Antes esto ERA el rótulo en versalitas
// (text-xs uppercase tracking-wider text-ink-soft): ninguna tarjeta tenía
// título, solo etiqueta. Eso vaciaba el nivel intermedio de la voz tipográfica
// —se saltaba del micro-rótulo al titular serif, sin nada en medio— y obligaba
// a que el texto de al lado fuese diminuto para no competir con nada.
// Ahora es lo que dice ser: un h2, en Fraunces, con tinta plena.
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-display text-lg leading-snug text-ink", className)}
      {...props}
    />
  );
}

// El rótulo en versalitas, ahora explícito y a petición. Sigue siendo útil
// como antetítulo o para encabezar una sección, pero pasa a ser la excepción:
// funciona porque es escaso, y a 94 repeticiones había dejado de jerarquizar
// para convertirse en textura de fondo.
export function CardLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-2xs font-semibold uppercase tracking-[0.12em] text-ink-soft",
        className
      )}
      {...props}
    />
  );
}
