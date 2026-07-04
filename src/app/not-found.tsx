import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-3xl border border-sand bg-paper p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-faint">
          <Compass className="h-7 w-7 text-rose" />
        </span>
        <h1 className="mt-4 font-display text-2xl text-ink">Esta pagina no existe</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Te habras perdido por el camino. Lo importante esta en casa.
        </p>
        <Link
          href="/home"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-rose px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-deep"
        >
          Volver a casa
        </Link>
      </div>
    </div>
  );
}
