import { Ban, Lock, Trash2, Users } from "lucide-react";

// Confianza como mensaje, no como nota al pie: para una pareja, entregar su
// intimidad a una app es un acto de fe. Aquí se dice, honesto y claro, qué es
// Near y qué NO es. (Sin prometer cifrado E2EE: el chat aún no lo tiene; lo
// que sí es cierto es el acceso restringido a los dos miembros.)
const POINTS = [
  { icon: Users, text: "Solo vosotros dos. Nadie más puede entrar." },
  { icon: Ban, text: "Sin feed, sin seguidores, sin me gusta." },
  { icon: Lock, text: "Sin anuncios ni terceros husmeando." },
  { icon: Trash2, text: "Vuestro. Y borrable cuando queráis." }
];

export function TrustNote() {
  return (
    <div className="rounded-2xl border border-sand bg-paper/60 p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        Vuestro espacio, y de nadie más
      </p>
      <ul className="mt-3 space-y-2">
        {POINTS.map((point) => (
          <li key={point.text} className="flex items-center gap-2.5 text-sm text-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose/10 text-rose-deep">
              <point.icon className="h-3.5 w-3.5" />
            </span>
            {point.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
