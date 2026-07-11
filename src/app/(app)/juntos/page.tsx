import type { Metadata } from "next";
import { Gamepad2, HeartHandshake, MonitorPlay, Moon, Paintbrush, Sparkles } from "lucide-react";
import { requireCouple } from "@/lib/couple";
import { isUserOnline } from "@/lib/realtime";
import { PartnerOnline } from "@/features/presence/partner-online";
import { HubCard, type HubItem } from "@/features/hub/hub-card";

export const metadata: Metadata = { title: "Juntos" };
export const dynamic = "force-dynamic";

// Hub "Juntos": todo lo que se hace A LA VEZ. Una pantalla, acciones claras.
export default async function JuntosPage() {
  const { partner } = await requireCouple();
  const partnerName = partner?.name ?? "tu pareja";
  const partnerOnline = partner ? isUserOnline(partner.id) : false;

  const items: HubItem[] = [
    {
      href: "/cerca",
      title: "Cerca de verdad",
      description: "Aprecio, preguntas para conoceros más y el pulso de la semana.",
      icon: HeartHandshake,
      accent: "from-rose to-plum",
      accentSoft: "bg-rose/12",
      accentText: "text-rose-deep"
    },
    {
      href: "/together",
      title: "Estar juntos",
      description: "Su cielo, su hora y cómo está ahora mismo. Para dejarla abierta.",
      icon: Moon,
      accent: "from-indigo-400 to-violet-700",
      accentSoft: "bg-indigo-500/12",
      accentText: "text-indigo-600 dark:text-indigo-400"
    },
    {
      href: "/date-room",
      title: "Ver juntos",
      description: "Un vídeo o una peli sincronizados, con videollamada y chat propio.",
      icon: MonitorPlay,
      accent: "from-rose to-plum",
      accentSoft: "bg-rose/12",
      accentText: "text-rose-deep"
    },
    {
      href: "/canvas",
      title: "Lienzo",
      description: "Dibujáis a la vez sobre el mismo papel. Se guarda en el álbum.",
      icon: Paintbrush,
      accent: "from-sky-400 to-blue-600",
      accentSoft: "bg-sky-500/12",
      accentText: "text-sky-600 dark:text-sky-400"
    },
    {
      href: "/play",
      title: "Jugar",
      description: "Arcade con retos diarios y el 4 en raya en directo.",
      icon: Gamepad2,
      accent: "from-amber-400 to-orange-500",
      accentSoft: "bg-amber-500/12",
      accentText: "text-amber-600 dark:text-amber-400"
    }
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Juntos</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
          Cosas para hacer a la vez.
          {partner && (
            <span className="inline-flex items-center gap-1.5">
              <PartnerOnline partnerId={partner.id} initialOnline={partnerOnline} />
            </span>
          )}
        </p>
      </header>

      {partnerOnline && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" />
          {partnerName} está en Near ahora: buen momento para coincidir.
        </div>
      )}

      <div className="grid gap-3">
        {items.map((item) => (
          <HubCard key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}
