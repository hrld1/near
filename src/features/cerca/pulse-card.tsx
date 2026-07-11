"use client";

import { useState } from "react";
import { Waves } from "lucide-react";
import { setPulseAction } from "@/actions/pulse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LABELS = ["Lejos", "Algo lejos", "Bien", "Cerca", "Muy cerca"];

type Pulse = { value: number; note: string | null };

// El pulso de la semana: un termómetro suave de "cómo de cerca os sentís".
// No es secreto: cuando los dos lo marcáis, se ven las dos marcas.
export function PulseCard({
  initialMine,
  partner,
  partnerName
}: {
  initialMine: Pulse | null;
  partner: Pulse | null;
  partnerName: string;
}) {
  const [mine, setMine] = useState<Pulse | null>(initialMine);
  const [editing, setEditing] = useState(initialMine === null);
  const [value, setValue] = useState(initialMine?.value ?? 4);
  const [note, setNote] = useState(initialMine?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    const res = await setPulseAction({ value, note: note.trim() || undefined });
    if (res.ok) {
      setMine({ value, note: note.trim() || null });
      setEditing(false);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-sand-deep bg-paper p-4 shadow-card">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-plum">
        <Waves className="h-4 w-4" /> El pulso de la semana
      </p>
      <p className="mt-1 font-display text-lg text-ink">¿Cómo de cerca te has sentido esta semana?</p>

      {editing ? (
        <div className="mt-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setValue(v)}
                aria-label={LABELS[v - 1]}
                className={cn(
                  "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition",
                  v <= value
                    ? "border-transparent bg-gradient-to-br from-rose to-plum text-white shadow-card"
                    : "border-sand-deep bg-paper text-ink-soft hover:border-rose/40"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-xs font-medium text-ink-soft">{LABELS[value - 1]}</p>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Una línea sobre por qué (opcional)…"
            className="mt-3"
          />
          <div className="mt-2 flex justify-end gap-2">
            {mine && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
            <Button size="sm" onClick={save} loading={saving}>
              Guardar el pulso
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <Reading label="Tú" value={mine?.value ?? 0} note={mine?.note ?? null} tone="me" />
          {partner ? (
            <Reading label={partnerName} value={partner.value} note={partner.note} tone="them" />
          ) : (
            <p className="text-xs text-ink-soft">{partnerName} aún no ha marcado su pulso esta semana.</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-rose transition hover:underline"
          >
            Cambiar el mío
          </button>
        </div>
      )}
    </div>
  );
}

function Reading({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: number;
  note: string | null;
  tone: "me" | "them";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-semibold", tone === "me" ? "text-ink" : "text-rose-deep")}>{label}</span>
        <span className="text-ink-soft">{LABELS[Math.min(4, Math.max(0, value - 1))]}</span>
      </div>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <span
            key={v}
            className={cn(
              "h-2 flex-1 rounded-full",
              v <= value
                ? tone === "me"
                  ? "bg-gradient-to-r from-rose to-rose-deep"
                  : "bg-gradient-to-r from-plum to-violet-600"
                : "bg-sand"
            )}
          />
        ))}
      </div>
      {note && <p className="mt-1 text-xs text-ink-soft">“{note}”</p>}
    </div>
  );
}
