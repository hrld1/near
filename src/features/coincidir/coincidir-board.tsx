"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Phone, Plus, Sparkles, Trash2 } from "lucide-react";
import { addFreeSlotAction, proposeCallAction, removeFreeSlotAction } from "@/actions/coincidir";
import { dayInTz, timeInTz } from "@/lib/format";
import { cn } from "@/lib/utils";

type Slot = { id: string; start: string; end: string };
type Overlap = { start: string; end: string };

const DURATIONS = [
  { label: "1 h", mins: 60 },
  { label: "2 h", mins: 120 },
  { label: "3 h", mins: 180 },
  { label: "Toda la tarde", mins: 300 }
];

function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CoincidirBoard({
  myName,
  partnerName,
  myTz,
  partnerTz,
  mySlots,
  partnerSlots,
  overlaps
}: {
  myName: string;
  partnerName: string;
  myTz: string;
  partnerTz: string;
  mySlots: Slot[];
  partnerSlots: Slot[];
  overlaps: Overlap[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startInput, setStartInput] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return localInputValue(d);
  });
  const [duration, setDuration] = useState(120);
  const [proposed, setProposed] = useState<string | null>(null);

  async function add(start: Date, end: Date) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await addFreeSlotAction({ start: start.toISOString(), end: end.toISOString() });
    if (!res.ok) setError(res.error);
    else router.refresh();
    setBusy(false);
  }

  function preset(dayOffset: number, hour: number, mins: number, weekday?: number) {
    const d = new Date();
    if (weekday !== undefined) {
      const diff = (weekday - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff);
    } else {
      d.setDate(d.getDate() + dayOffset);
    }
    d.setHours(hour, 0, 0, 0);
    const end = new Date(d.getTime() + mins * 60000);
    void add(d, end);
  }

  function addCustom() {
    const start = new Date(startInput);
    if (Number.isNaN(start.getTime())) {
      setError("Elige una fecha y hora");
      return;
    }
    void add(start, new Date(start.getTime() + duration * 60000));
  }

  async function remove(id: string) {
    setBusy(true);
    await removeFreeSlotAction(id);
    router.refresh();
    setBusy(false);
  }

  async function propose(o: Overlap) {
    if (busy) return;
    setBusy(true);
    const res = await proposeCallAction({ start: o.start, end: o.end, title: "Llamada" });
    if (res.ok) {
      setProposed(o.start);
      setTimeout(() => setProposed(null), 3500);
      router.refresh();
    } else if (!res.ok) {
      setError(res.error);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      {/* CUÁNDO COINCIDÍS: la estrella */}
      <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-paper to-paper p-5 shadow-card">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" /> Cuándo coincidís
        </p>
        {overlaps.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Marcad abajo cuándo estáis libres y aquí verás las franjas en las que podéis hablar los dos.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {overlaps.map((o) => (
              <li
                key={o.start}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper/80 px-4 py-3 shadow-card"
              >
                <div>
                  <p className="font-display text-lg capitalize text-ink">{dayInTz(o.start, myTz)}</p>
                  <p className="text-sm text-ink-soft">
                    <span className="font-medium text-ink">
                      {timeInTz(o.start, myTz)}–{timeInTz(o.end, myTz)}
                    </span>{" "}
                    tu hora · {timeInTz(o.start, partnerTz)}–{timeInTz(o.end, partnerTz)} la de {partnerName}
                  </p>
                </div>
                {proposed === o.start ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <Check className="h-4 w-4" /> Propuesta
                  </span>
                ) : (
                  <button
                    onClick={() => propose(o)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-full bg-rose px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-60"
                  >
                    <Phone className="h-4 w-4" /> Proponer llamada
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* MARCAR FRANJAS */}
      <section className="rounded-2xl border border-sand-deep bg-paper p-5 shadow-card">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          <CalendarClock className="h-4 w-4" /> Marca cuándo estás libre
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PresetButton onClick={() => preset(0, 21, 120)} disabled={busy}>Esta noche</PresetButton>
          <PresetButton onClick={() => preset(1, 16, 180)} disabled={busy}>Mañana por la tarde</PresetButton>
          <PresetButton onClick={() => preset(0, 17, 180, 6)} disabled={busy}>Este sábado</PresetButton>
          <PresetButton onClick={() => preset(0, 12, 240, 0)} disabled={busy}>Este domingo</PresetButton>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Desde
            <input
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Durante
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
            >
              {DURATIONS.map((d) => (
                <option key={d.mins} value={d.mins}>{d.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={addCustom}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Añadir franja
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </section>

      {/* LISTAS */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SlotList
          title="Tus franjas"
          tone="me"
          slots={mySlots}
          tz={myTz}
          emptyText="Aún no has marcado ninguna."
          onRemove={remove}
          busy={busy}
        />
        <SlotList
          title={`Franjas de ${partnerName}`}
          tone="them"
          slots={partnerSlots}
          tz={myTz}
          secondaryTz={partnerTz}
          emptyText={`${partnerName} aún no ha marcado ninguna.`}
        />
      </div>
    </div>
  );
}

function PresetButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-1.5 text-sm text-ink transition hover:border-emerald-500 hover:bg-emerald-500/10 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SlotList({
  title,
  tone,
  slots,
  tz,
  secondaryTz,
  emptyText,
  onRemove,
  busy
}: {
  title: string;
  tone: "me" | "them";
  slots: Slot[];
  tz: string;
  secondaryTz?: string;
  emptyText: string;
  onRemove?: (id: string) => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand-deep bg-paper p-4 shadow-card">
      <p className={cn("text-xs font-semibold uppercase tracking-wider", tone === "me" ? "text-ink-soft" : "text-emerald-700 dark:text-emerald-400")}>
        {title}
      </p>
      {slots.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {slots.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="capitalize text-ink">{dayInTz(s.start, tz)}</span>{" "}
                <span className="text-ink-soft">
                  {timeInTz(s.start, tz)}–{timeInTz(s.end, tz)}
                  {secondaryTz && ` · su hora ${timeInTz(s.start, secondaryTz)}`}
                </span>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(s.id)}
                  disabled={busy}
                  aria-label="Quitar"
                  className="shrink-0 rounded-lg p-1 text-ink-soft transition hover:bg-rose/10 hover:text-rose-deep disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
