import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Card, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { PushToggle } from "@/features/settings/push-toggle";
import { SoundToggle } from "@/features/settings/sound-toggle";
import { AnniversaryForm } from "@/features/settings/anniversary-form";
import { SecuritySettings } from "@/features/settings/security-settings";
import { DangerZone } from "@/features/settings/danger-zone";
import { FeedbackForm } from "@/features/settings/feedback-form";
import { StatusCard } from "@/features/settings/status-card";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, couple, partner } = await requireCouple();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Ajustes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tu cuenta y este dispositivo. Lo compartido se decide entre los dos.
        </p>
      </header>

      {/* it35-audit: 9 tarjetas idénticas apiladas en una sola columna, incluso
          en escritorio ancho, sin ningún agrupamiento — la sección más "muro
          de ajustes" de la app. Agrupadas por tema (con el mismo rótulo en
          mayúsculas que ya usan Cerca y Play) y en pares en pantallas anchas,
          la misma información cabe en la mitad del scroll. */}
      <div className="space-y-8">
        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Preferencias
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardTitle>Notificaciones</CardTitle>
              <div className="mt-3">
                <PushToggle />
              </div>
            </Card>
            <Card>
              <CardTitle>Sonido y vibración</CardTitle>
              <div className="mt-3">
                <SoundToggle />
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Vuestro espacio
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardTitle>Vuestro aniversario</CardTitle>
              <div className="mt-3">
                <AnniversaryForm
                  current={couple.anniversary ? couple.anniversary.toISOString().slice(0, 10) : null}
                />
              </div>
            </Card>
            <Card>
              <CardTitle>Vuestros datos</CardTitle>
              <p className="mt-1 text-sm text-ink-soft">
                Todo lo que habéis escrito y guardado es vuestro. Descargadlo cuando queráis.
              </p>
              <a
                href="/api/export"
                download
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sand-deep bg-paper px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand"
              >
                <Download className="h-4 w-4" />
                Descargar todo lo nuestro
              </a>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Cuenta
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardTitle>Cuenta</CardTitle>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Nombre</dt>
                  <dd className="font-medium text-ink">{user.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Email</dt>
                  <dd className="font-medium text-ink">{user.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Tu zona horaria</dt>
                  <dd className="font-medium text-ink">{user.timezone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Pareja</dt>
                  <dd className="font-medium text-ink">{partner?.name ?? "Sin vincular"}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <CardTitle>Contraseña y acceso</CardTitle>
              <div className="mt-3">
                <SecuritySettings partnerName={partner?.name ?? null} />
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Confianza
          </h2>
          <div className="space-y-4">
            <StatusCard />
            <Card>
              <CardTitle>¿Qué le falta a Near?</CardTitle>
              <div className="mt-3">
                <FeedbackForm />
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Zona delicada
          </h2>
          <Card>
            <DangerZone partnerName={partner?.name ?? null} />
          </Card>
        </section>
      </div>
    </div>
  );
}
