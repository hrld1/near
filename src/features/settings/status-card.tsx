import { Info, ShieldCheck } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { storageMode } from "@/lib/storage";
import { turnEnabled } from "@/lib/ice";

// Estado y privacidad (it31): honestidad de piloto. Muestra la versión
// desplegada y dice sin adornos qué protege Near y qué todavía no — el chat
// NO está cifrado de extremo a extremo (hueco nº6 de la auditoría). Prometer
// cifrado que no existe sería el peor error de confianza posible.
export function StatusCard() {
  const version = process.env.APP_VERSION ?? "dev";
  const isPilot = version === "dev" || !process.env.APP_VERSION;

  return (
    <Card>
      <CardTitle>Estado y privacidad</CardTitle>

      {isPilot && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-plum/8 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-plum" />
          <p className="text-sm text-ink">
            Near está en <strong>piloto</strong>: sois de las primeras parejas en usarlo. Si algo
            falla o se echa en falta, contádnoslo abajo — se lee de verdad.
          </p>
        </div>
      )}

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Versión</dt>
          <dd className="font-mono text-xs text-ink">{version.slice(0, 12)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Vuestras fotos y audios</dt>
          <dd className="font-medium text-ink">
            {storageMode() === "s3" ? "En almacenamiento cifrado en reposo" : "En este servidor"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Llamadas</dt>
          <dd className="font-medium text-ink">
            {turnEnabled() ? "Con relé para redes difíciles" : "Directas entre vosotros"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-sand-deep bg-paper/60 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
        <p className="text-read text-ink-soft">
          Vuestra cuenta va con contraseña y solo vosotros dos veis lo vuestro. Con sinceridad: el
          chat <strong className="text-ink">aún no está cifrado de extremo a extremo</strong>, así
          que en teoría el servidor podría leer los mensajes. No lo hacemos, y estamos trabajando en
          cifrarlo. Preferimos decíroslo a que lo deis por hecho.
        </p>
      </div>
    </Card>
  );
}
