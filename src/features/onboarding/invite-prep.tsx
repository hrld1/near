"use client";

import { useState, useTransition } from "react";
import { CalendarHeart, Check, Mail, StickyNote } from "lucide-react";
import { savePrepAction } from "@/actions/couple";
import { Button } from "@/components/ui/button";

// Espera productiva: mientras la pareja acepta, se puede ir preparando el hogar.
// Todo esto se guarda en la invitación y aparece ya listo al vincularse.
export function InvitePrep({ code }: { code: string }) {
  const [anniversary, setAnniversary] = useState("");
  const [note, setNote] = useState("");
  const [letter, setLetter] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const empty = !anniversary && !note.trim() && !letter.trim();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await savePrepAction(code, {
        anniversary: anniversary || undefined,
        note: note.trim() || undefined,
        welcomeLetter: letter.trim() || undefined
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-sand bg-paper p-5 shadow-card">
      <h2 className="font-display text-xl text-ink">Mientras esperáis</h2>
      <p className="mt-1 text-read text-ink-soft">
        Prepara vuestro hogar. Cuando tu pareja entre, se lo encontrará ya hecho.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <CalendarHeart className="h-3.5 w-3.5 text-rose" /> Vuestra fecha
          </span>
          <input
            type="date"
            value={anniversary}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setAnniversary(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink focus:border-rose focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <StickyNote className="h-3.5 w-3.5 text-rose" /> Una nota
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder="Algo que quieras que lea nada más entrar"
            className="mt-1.5 w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <Mail className="h-3.5 w-3.5 text-rose" /> Carta de bienvenida
          </span>
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            maxLength={4000}
            rows={3}
            placeholder="Una carta que le estará esperando ya entregada"
            className="mt-1.5 w-full resize-none rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-rose-deep">{error}</p>}

      <Button onClick={save} loading={pending} disabled={empty} className="mt-4 w-full">
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Guardado
          </>
        ) : (
          "Guardar preparativos"
        )}
      </Button>
    </div>
  );
}
