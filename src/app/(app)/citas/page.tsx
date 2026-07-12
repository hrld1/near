import type { Metadata } from "next";
import { Sparkles, WandSparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { aiEnabled, AI_DAILY_LIMIT } from "@/lib/ai";
import { planSchema, type DatePlanData } from "@/lib/citas";
import { dayInTz, timeInTz } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { CitasChat } from "@/features/citas/citas-chat";
import { PlanList, type PlanListItemDto } from "@/features/citas/plan-list";

export const metadata: Metadata = { title: "Citas" };
export const dynamic = "force-dynamic";

export default async function CitasPage() {
  const { user, couple, partner } = await requireCouple();
  const partnerName = partner?.name ?? "tu pareja";

  if (!aiEnabled()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        <header className="mb-6">
          <h1 className="font-display text-3xl text-ink">Citas</h1>
        </header>
        <div className="rounded-2xl border border-dashed border-sand-deep bg-paper/60 p-8 text-center">
          <WandSparkles className="mx-auto h-9 w-9 text-ink-soft/50" />
          <h2 className="mt-3 font-display text-xl text-ink">La planificadora está dormida</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Esta instancia de Near no tiene configurada la clave de IA. Añade{" "}
            <code className="rounded bg-sand px-1.5 py-0.5 text-xs">ANTHROPIC_API_KEY</code> al entorno del
            servidor y esta página se convierte en una planificadora de citas con itinerarios reales.
          </p>
        </div>
      </div>
    );
  }

  const rows = await prisma.datePlan.findMany({
    where: { coupleId: couple.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { author: { select: { id: true, name: true } } }
  });
  const items: PlanListItemDto[] = [];
  for (const row of rows) {
    const plan = planSchema.safeParse({
      title: row.title,
      mode: row.mode,
      city: row.city ?? undefined,
      budget: row.budget ?? undefined,
      steps: row.steps
    });
    if (!plan.success) continue; // fila corrupta: no tumba la página
    const data: DatePlanData = plan.data;
    items.push({
      id: row.id,
      authorId: row.author.id,
      authorName: row.author.name,
      status: row.status,
      whenLabel: row.planDate
        ? `${dayInTz(row.planDate, user.timezone)} ${timeInTz(row.planDate, user.timezone)}`
        : null,
      plan: data
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <LiveRefresh types={["cita:update"]} />
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Citas</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Cuéntale la cita que os apetece y os la deja planeada: sitios reales si estáis juntos, o una cita a
          distancia con lo mejor de Near. Hasta {AI_DAILY_LIMIT} mensajes al día.
        </p>
      </header>

      <CitasChat partnerName={partnerName} />

      <section className="mt-7">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">Vuestras citas planeadas</h2>
        <PlanList items={items} myId={user.id} partnerName={partnerName} />
      </section>
    </div>
  );
}
