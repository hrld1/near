import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, BookHeart, CalendarHeart, Mail, MapPin, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { HubGrid, type HubItem } from "@/features/hub/hub-card";

export const metadata: Metadata = { title: "Recuerdos" };
export const dynamic = "force-dynamic";

// Hub "Recuerdos": vuestra historia a lo largo del tiempo. Cada tarjeta lleva
// una linea de contexto real (cuántas fotos, cartas en camino, próxima fecha).
export default async function RecuerdosPage() {
  const { couple } = await requireCouple();
  const now = new Date();

  const [momentCount, lettersInTransit, nextEvent] = await Promise.all([
    prisma.moment.count({ where: { coupleId: couple.id } }),
    prisma.letter.count({ where: { coupleId: couple.id, deliverAt: { gt: now } } }).catch(() => 0),
    prisma.calendarEvent.findFirst({
      where: { coupleId: couple.id, startsAt: { gt: now } },
      orderBy: { startsAt: "asc" }
    })
  ]);

  const daysToEvent = nextEvent
    ? Math.max(0, Math.ceil((nextEvent.startsAt.getTime() - now.getTime()) / 86_400_000))
    : null;

  const items: HubItem[] = [
    {
      href: "/moments",
      title: "Álbum y diario",
      description: "Vuestras fotos y recuerdos, guardados para siempre.",
      icon: BookHeart,
      live:
        momentCount > 0
          ? `${momentCount} ${momentCount === 1 ? "momento guardado" : "momentos guardados"}`
          : undefined
    },
    {
      href: "/letters",
      title: "Cartas",
      description: "Escribe hoy, llega mañana. O una cápsula para el futuro.",
      icon: Mail,
      live:
        lettersInTransit > 0
          ? `${lettersInTransit} ${lettersInTransit === 1 ? "carta en camino" : "cartas en camino"}`
          : undefined
    },
    {
      href: "/calendar",
      title: "Fechas",
      description: "Marcad vuestro próximo reencuentro y contad los días.",
      icon: CalendarHeart,
      live:
        daysToEvent !== null
          ? daysToEvent === 0
            ? "Vuestra próxima fecha es hoy"
            : `Próxima fecha en ${daysToEvent} ${daysToEvent === 1 ? "día" : "días"}`
          : undefined
    },
    {
      href: "/map",
      title: "Distancia",
      description: "Vuestras dos ciudades, los km, el cielo y el clima del otro.",
      icon: MapPin
    },
    {
      href: "/libro",
      title: "Vuestro libro",
      description: "Vuestro mes o vuestro año, contado por capítulos. Imprimible.",
      icon: BarChart3
    }
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-5xl md:px-8 md:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <BookHeart className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Recuerdos</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">Vuestra historia, a un toque.</p>
      </header>

      {/* La constelación: la experiencia inmersiva de toda vuestra historia como
          un cielo por el que navegar. Se presenta con su propia estética de
          noche para que se note que es algo aparte. */}
      <Link
        href="/constelacion"
        className="group mb-3 block overflow-hidden rounded-3xl"
      >
        <div className="relative flex items-center gap-4 bg-[radial-gradient(120%_140%_at_15%_-20%,#2a1f45_0%,#150f28_55%,#0d0a18_100%)] p-6 shadow-lift transition group-hover:-translate-y-0.5 md:p-7">
          <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_20%_35%,#fff,transparent),radial-gradient(1px_1px_at_65%_20%,#fff,transparent),radial-gradient(1px_1px_at_80%_70%,#fff,transparent),radial-gradient(1px_1px_at_40%_80%,#fff,transparent),radial-gradient(1px_1px_at_92%_40%,#fff,transparent),radial-gradient(1px_1px_at_10%_65%,#fff,transparent)]" />
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
            <Sparkles className="h-7 w-7" />
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="font-display text-2xl leading-tight text-white">Vuestra constelación</p>
            <p className="mt-1 max-w-md text-sm text-white/70">
              Toda vuestra historia como un cielo. Alejaos para ver los años; acercaos y aparecen los
              meses, las fotos, las citas y vuestras frases.
            </p>
          </div>
          <span className="relative hidden shrink-0 items-center gap-1.5 rounded-full bg-white/12 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition group-hover:gap-2.5 sm:flex">
            Explorar <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <HubGrid items={items} />
    </div>
  );
}
