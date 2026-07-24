import type { Metadata } from "next";
import Link from "next/link";
import {
  BookHeart,
  Crown,
  Flame,
  Gamepad2,
  HeartHandshake,
  MessageCircle,
  Sparkles,
  Sprout
} from "lucide-react";
import { requireCouple } from "@/lib/couple";
import { getLibro, type Libro } from "@/lib/libro-server";
import { PrintButton } from "@/features/libro/print-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vuestro libro" };
export const dynamic = "force-dynamic";

// "Vuestro libro": el Wrapped de la pareja — un período (mes o año) contado
// como un tesoro por capítulos, imprimible como PDF. Solo lecturas.

function periodPills(current: string, timezone: string) {
  const now = new Date();
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(d);
  const thisMonth = fmt(now);
  const prev = new Date(now);
  prev.setMonth(prev.getMonth() - 1);
  const lastMonth = fmt(prev);
  const year = thisMonth.slice(0, 4);
  return [
    { key: thisMonth, label: "Este mes" },
    { key: lastMonth, label: "El mes pasado" },
    { key: year, label: `Todo ${year}` }
  ].map((p) => ({ ...p, active: p.key === current }));
}

function Chapter({
  eyebrow,
  icon: Icon,
  children,
  className
}: {
  eyebrow: string;
  icon: typeof Flame;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "print-page overflow-hidden rounded-3xl border border-sand/70 bg-paper p-6 shadow-card md:p-8",
        className
      )}
    >
      <p className="mb-4 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.16em] text-rose-deep">
        <Icon className="h-4 w-4" /> {eyebrow}
      </p>
      {children}
    </section>
  );
}

function Big({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">{n}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function closingLine(libro: Libro): string {
  const { constancia, palabras, momentos, cuidaros } = libro;
  if (constancia.best >= 14) return `Catorce días seguidos se dicen pronto. Vosotros llegasteis a ${constancia.best}.`;
  if (palabras.appreciations >= 5) return "Os dijisteis en voz alta lo que muchos callan. Eso construye.";
  if (momentos.photosTotal >= 10) return "Mirad cuánta vida cabe en unas cuantas fotos pequeñas.";
  if (cuidaros.repairs > 0) return "Hubo tormenta y la cerrasteis juntos. Eso también es quereros.";
  if (palabras.messages > 0) return "La distancia puso los kilómetros. Vosotros pusisteis todo lo demás.";
  return "Este capítulo aún está por escribir. El siguiente es vuestro.";
}

export default async function LibroPage({ searchParams }: { searchParams: { p?: string } }) {
  const { user, couple, partner } = await requireCouple();
  const libro = await getLibro(
    { id: couple.id, timezone: couple.timezone, createdAt: couple.createdAt },
    { id: user.id, name: user.name, city: user.city, latitude: user.latitude, longitude: user.longitude },
    partner
      ? { id: partner.id, name: partner.name, city: partner.city, latitude: partner.latitude, longitude: partner.longitude }
      : null,
    searchParams.p
  );
  const pills = periodPills(libro.period.key, couple.timezone);
  const { portada, momentos, palabras, juego, cuidaros, constancia } = libro;
  const hasAnything =
    momentos.photosTotal + momentos.momentsTotal + palabras.messages + palabras.appreciations + juego.played + cuidaros.citas + constancia.totalComplete > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">Vuestro libro</h1>
          <p className="mt-1 text-sm text-ink-soft">Un período de los dos, contado como se merece. Y en papel, si queréis.</p>
        </div>
        <PrintButton />
      </header>

      <div className="no-print mb-5 flex flex-wrap gap-2">
        {pills.map((p) => (
          <Link
            key={p.key}
            href={`/libro?p=${p.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              p.active
                ? "bg-gradient-to-r from-rose to-plum text-white shadow-glow"
                : "border border-sand-deep bg-paper text-ink-soft hover:border-rose/40 hover:text-ink"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {/* PORTADA */}
        <section className="print-page relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose via-rose-deep to-plum p-8 text-white shadow-lift md:p-10">
          <Sparkles className="absolute -right-6 -top-6 h-36 w-36 opacity-10" />
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-white/75">Vuestro libro</p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {portada.meName} <span className="font-normal italic opacity-80">&</span> {portada.partnerName}
          </h2>
          <p className="mt-1 font-display text-xl italic text-white/85">{libro.period.label}</p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="font-display text-3xl font-semibold">{portada.daysOfUs}</p>
              <p className="text-xs uppercase tracking-wide text-white/75">días de vosotros en Near</p>
            </div>
            {portada.km !== null && (
              <div>
                <p className="font-display text-3xl font-semibold">{portada.km.toLocaleString("es-ES")} km</p>
                <p className="text-xs uppercase tracking-wide text-white/75">
                  {portada.cities ?? "de distancia"} — y aquí seguís
                </p>
              </div>
            )}
          </div>
        </section>

        {!hasAnything && (
          <Chapter eyebrow="Por escribir" icon={BookHeart}>
            <p className="font-display text-2xl text-ink">Este período aún está en blanco.</p>
            <p className="mt-2 text-read text-ink-soft">
              Cada foto, mensaje, aprecio o duelo que compartáis irá llenando estas páginas solo.
            </p>
          </Chapter>
        )}

        {/* MOMENTOS */}
        {(momentos.photosTotal > 0 || momentos.momentsTotal > 0) && (
          <Chapter eyebrow="Lo que visteis" icon={BookHeart}>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Big n={momentos.photosTotal} label="momentos del día" />
              <Big n={momentos.momentsTotal} label="recuerdos guardados" />
            </div>
            {momentos.mosaic.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {momentos.mosaic.map((photo, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={photo.url}
                    alt={photo.caption ?? "Momento del día"}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
            {momentos.topMoment && (
              <p className="mt-4 text-sm text-ink-soft">
                El recuerdo que más os hizo hablar:{" "}
                <b className="text-ink">{momentos.topMoment.title ?? "una foto vuestra"}</b> (
                {momentos.topMoment.comments} comentarios).
              </p>
            )}
          </Chapter>
        )}

        {/* PALABRAS */}
        {(palabras.messages > 0 || palabras.appreciations > 0 || palabras.preguntas > 0) && (
          <Chapter eyebrow="Lo que os dijisteis" icon={MessageCircle}>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Big n={palabras.messages.toLocaleString("es-ES")} label="mensajes" />
              {palabras.voices > 0 && <Big n={palabras.voices} label="notas de voz" />}
              {palabras.preguntas > 0 && <Big n={palabras.preguntas} label="preguntas respondidas" />}
              {palabras.appreciations > 0 && <Big n={palabras.appreciations} label="aprecios al frasco" />}
            </div>
            {palabras.aprecioDestacado && (
              <blockquote className="mt-5 border-l-2 border-rose/50 pl-4 font-display text-xl italic leading-snug text-ink">
                “{palabras.aprecioDestacado}”
              </blockquote>
            )}
          </Chapter>
        )}

        {/* JUEGO */}
        {juego.played > 0 && (
          <Chapter eyebrow="Lo que competisteis" icon={Gamepad2}>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <Big n={juego.played} label="duelos diarios" />
              <div className="flex items-end gap-6">
                <div className={cn(juego.myWins >= juego.partnerWins && "text-rose-deep")}>
                  <p className="flex items-center gap-1 font-display text-4xl font-semibold">
                    {juego.myWins}
                    {juego.myWins > juego.partnerWins && <Crown className="h-5 w-5 text-amber-500" />}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">{portada.meName}</p>
                </div>
                <span className="pb-4 font-display text-lg italic text-ink-soft">vs</span>
                <div className={cn(juego.partnerWins >= juego.myWins && "text-plum")}>
                  <p className="flex items-center gap-1 font-display text-4xl font-semibold">
                    {juego.partnerWins}
                    {juego.partnerWins > juego.myWins && <Crown className="h-5 w-5 text-amber-500" />}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">{portada.partnerName}</p>
                </div>
                {juego.draws > 0 && (
                  <div>
                    <p className="font-display text-4xl font-semibold text-ink-soft">{juego.draws}</p>
                    <p className="text-xs uppercase tracking-wide text-ink-soft">empates</p>
                  </div>
                )}
              </div>
            </div>
          </Chapter>
        )}

        {/* CUIDAROS */}
        {(cuidaros.pulseAvg !== null || cuidaros.repairs > 0 || cuidaros.letters > 0 || cuidaros.citas > 0) && (
          <Chapter eyebrow="Lo que os cuidasteis" icon={HeartHandshake}>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {cuidaros.pulseAvg !== null && <Big n={`${cuidaros.pulseAvg}/5`} label="pulso medio de cercanía" />}
              {cuidaros.letters > 0 && <Big n={cuidaros.letters} label="cartas entregadas" />}
              {cuidaros.citas > 0 && (
                <Big n={`${cuidaros.citasAceptadas}/${cuidaros.citas}`} label="citas planeadas → aceptadas" />
              )}
            </div>
            {cuidaros.repairs > 0 && (
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <Sprout className="h-4 w-4 text-emerald-600" />
                {cuidaros.repairs === 1
                  ? "Una tormenta, cerrada juntos. Eso también es quereros."
                  : `${cuidaros.repairs} tormentas, cerradas juntos. Eso también es quereros.`}
              </p>
            )}
          </Chapter>
        )}

        {/* CONSTANCIA */}
        {constancia.totalComplete > 0 && (
          <Chapter eyebrow="Lo que no fallasteis" icon={Flame}>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Big n={constancia.best} label="días seguidos, los dos" />
              <Big n={constancia.totalComplete} label="días completos en total" />
            </div>
          </Chapter>
        )}

        {/* CONTRAPORTADA */}
        <section className="print-page rounded-3xl border border-sand/70 bg-paper p-8 text-center shadow-card">
          <p className="mx-auto max-w-md text-balance font-display text-2xl italic leading-snug text-ink">
            {closingLine(libro)}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-soft">
            Hecho con Near · {libro.period.label}
          </p>
        </section>
      </div>
    </div>
  );
}
