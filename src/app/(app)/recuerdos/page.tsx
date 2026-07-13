import type { Metadata } from "next";
import { BarChart3, BookHeart, CalendarHeart, Mail, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { HubCard, type HubItem } from "@/features/hub/hub-card";

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
      accent: "from-rose to-plum",
      accentSoft: "bg-rose/12",
      accentText: "text-rose-deep",
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
      accent: "from-amber-400 to-orange-500",
      accentSoft: "bg-amber-500/12",
      accentText: "text-amber-600 dark:text-amber-400",
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
      accent: "from-fuchsia-400 to-pink-600",
      accentSoft: "bg-fuchsia-500/12",
      accentText: "text-fuchsia-600 dark:text-fuchsia-400",
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
      icon: MapPin,
      accent: "from-sky-400 to-blue-600",
      accentSoft: "bg-sky-500/12",
      accentText: "text-sky-600 dark:text-sky-400"
    },
    {
      href: "/libro",
      title: "Vuestro libro",
      description: "Vuestro mes o vuestro año, contado por capítulos. Imprimible.",
      icon: BarChart3,
      accent: "from-emerald-400 to-teal-600",
      accentSoft: "bg-emerald-500/12",
      accentText: "text-emerald-600 dark:text-emerald-400"
    }
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl md:px-8 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Recuerdos</h1>
        <p className="mt-1 text-sm text-ink-soft">Vuestra historia, a un toque.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <HubCard key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}
