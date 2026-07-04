import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Card, CardTitle } from "@/components/ui/card";
import { PushToggle } from "@/features/settings/push-toggle";
import { AnniversaryForm } from "@/features/settings/anniversary-form";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, couple, partner } = await requireCouple();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Ajustes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tu cuenta y este dispositivo. Lo compartido se decide entre los dos.
        </p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardTitle>Notificaciones</CardTitle>
          <div className="mt-3">
            <PushToggle />
          </div>
        </Card>

        <Card>
          <CardTitle>Vuestro aniversario</CardTitle>
          <div className="mt-3">
            <AnniversaryForm
              current={couple.anniversary ? couple.anniversary.toISOString().slice(0, 10) : null}
            />
          </div>
        </Card>

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
      </div>
    </div>
  );
}
