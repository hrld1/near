"use client";

import { useState, useTransition } from "react";
import { HeartHandshake } from "lucide-react";
import { setAnniversaryAction } from "@/actions/couple";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

// Fecha de aniversario compartida: la puede fijar/cambiar cualquiera de los dos.
export function AnniversaryForm({ current }: { current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setAnniversaryAction(value);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div>
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" />
        El día en que empezasteis. Activa el contador de mesiversarios y
        aniversarios en el inicio.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1">
          <Label htmlFor="anniversary">Fecha</Label>
          <Input
            id="anniversary"
            type="date"
            value={value}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <Button size="md" loading={pending} onClick={save}>
          Guardar
        </Button>
      </div>
      {saved && <p className="mt-2 text-xs font-medium text-emerald-600">Guardado.</p>}
      {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
