"use client";

import { useState } from "react";
import { useServerState } from "@/hooks/use-server-state";
import { Cloudy, Sun } from "lucide-react";
import { submitRepairEntryAction } from "@/actions/repair";
import { REPAIR_FEELINGS } from "@/lib/repair";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Entry = { feelings: string[]; perspective: string; need: string };

// "Después de la tormenta": en calma, cada uno deja cómo se sintió, su punto de
// vista (sin culpar) y qué necesita. Ves la reflexión del otro solo cuando
// compartes la tuya. Convierte una discusión en entendimiento.
export function AftermathTool({
  partnerName,
  initialRepairId,
  initialMine,
  initialPartner,
  partnerAnswered
}: {
  partnerName: string;
  initialRepairId: string | null;
  initialMine: Entry | null;
  initialPartner: Entry | null;
  partnerAnswered: boolean;
}) {
  const [repairId, setRepairId] = useServerState<string | null>(initialRepairId);
  const [mine, setMine] = useServerState<Entry | null>(initialMine);
  const [partner, setPartner] = useServerState<Entry | null>(initialPartner);
  const [theyAnswered, setTheyAnswered] = useState(partnerAnswered);

  const [feelings, setFeelings] = useState<string[]>([]);
  const [perspective, setPerspective] = useState("");
  const [need, setNeed] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(f: string) {
    setFeelings((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
  }

  async function submit() {
    if (!perspective.trim() || !need.trim() || saving) return;
    setSaving(true);
    setError(null);
    const res = await submitRepairEntryAction({
      repairId: repairId ?? undefined,
      feelings,
      perspective: perspective.trim(),
      need: need.trim()
    });
    if (res.ok && res.data) {
      setMine({ feelings, perspective: perspective.trim(), need: need.trim() });
      setPartner(res.data.partnerEntry);
      setRepairId(res.data.repairId);
    } else if (!res.ok) {
      setError(res.error);
    }
    setSaving(false);
  }

  function startNew() {
    setMine(null);
    setPartner(null);
    setTheyAnswered(false);
    setRepairId(null);
    setFeelings([]);
    setPerspective("");
    setNeed("");
  }

  return (
    <div className="rounded-2xl border border-sand-deep bg-paper p-4 shadow-card">
      <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
        <Cloudy className="h-4 w-4" /> Después de la tormenta
      </p>

      {mine ? (
        <div className="mt-3 space-y-3">
          <EntryCard entry={mine} label="Tú" tone="me" />
          {partner ? (
            <EntryCard entry={partner} label={partnerName} tone="them" />
          ) : (
            <p className="text-xs text-ink-soft">
              {partnerName} aún no ha compartido su reflexión. Aparecerá aquí cuando lo haga.
            </p>
          )}
          {partner && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Sun className="h-4 w-4" /> Os habéis contado cómo os sentisteis. Eso ya es reparar.
            </p>
          )}
          <button onClick={startNew} className="text-xs font-medium text-rose transition hover:underline">
            Procesar otra discusión
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-ink-soft">
            Cuando los dos estéis en calma. Ves la reflexión de {partnerName} solo al compartir la tuya.
          </p>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">¿Cómo te sentiste?</p>
            <div className="flex flex-wrap gap-2">
              {REPAIR_FEELINGS.map((f) => (
                <button
                  key={f}
                  onClick={() => toggle(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition",
                    feelings.includes(f)
                      ? "border-transparent bg-emerald-600 text-white"
                      : "border-sand-deep bg-paper text-ink-soft hover:border-emerald-500/50"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Tu punto de vista</p>
            <Textarea
              value={perspective}
              onChange={(e) => setPerspective(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Desde el 'yo', sin culpar: qué sentiste y por qué…"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Qué necesitas para estar mejor</p>
            <Textarea
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Qué te ayudaría, o qué te gustaría que hiciéramos distinto…"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">
              {theyAnswered ? `${partnerName} ya compartió la suya: responde para verla` : "Se revela al compartir la tuya"}
            </p>
            <Button size="sm" onClick={submit} loading={saving} disabled={!perspective.trim() || !need.trim()}>
              Compartir mi reflexión
            </Button>
          </div>
          {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, label, tone }: { entry: Entry; label: string; tone: "me" | "them" }) {
  return (
    <div className={cn("rounded-xl px-4 py-3", tone === "me" ? "bg-sand" : "bg-emerald-500/8 dark:bg-emerald-500/10")}>
      <p className={cn("text-2xs font-semibold uppercase tracking-wider", tone === "me" ? "text-ink-soft" : "text-emerald-700 dark:text-emerald-400")}>
        {label}
      </p>
      {entry.feelings.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {entry.feelings.map((f) => (
            <span key={f} className="rounded-full bg-black/5 px-2 py-0.5 text-2xs text-ink dark:bg-white/10">
              {f}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{entry.perspective}</p>
      <p className="mt-2 text-sm text-ink">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Necesito: </span>
        {entry.need}
      </p>
    </div>
  );
}
