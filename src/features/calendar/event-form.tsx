"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarPlus, X } from "lucide-react";
import { createEventAction } from "@/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EVENT_KINDS, cn } from "@/lib/utils";
import { eventIcon } from "@/components/product-icons";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Crear evento
    </Button>
  );
}

export function EventForm() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("DATE");
  const [state, action] = useFormState(createEventAction, {});

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Nueva fecha
      </Button>
    );
  }

  return (
    <Card className="animate-fade-up p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Nueva fecha</h2>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-soft hover:bg-sand">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form action={action} className="space-y-3.5">
        <div className="flex flex-wrap gap-1.5">
          {EVENT_KINDS.map((k) => {
            const Icon = eventIcon(k.key);
            return (
              <button
                type="button"
                key={k.key}
                onClick={() => setKind(k.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  kind === k.key
                    ? "border-rose bg-rose-faint text-rose-deep"
                    : "border-sand-deep bg-paper text-ink-soft hover:bg-sand"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {k.label}
              </button>
            );
          })}
          <input type="hidden" name="kind" value={kind} />
        </div>
        <div>
          <Label htmlFor="e-title">Titulo</Label>
          <Input
            id="e-title"
            name="title"
            maxLength={100}
            placeholder={kind === "VISIT" ? "Reencuentro en..." : "Noche de pelis"}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="e-starts">Fecha y hora</Label>
            <Input id="e-starts" name="startsAt" type="datetime-local" required />
          </div>
          <div>
            <Label htmlFor="e-ends">Fin (opcional)</Label>
            <Input id="e-ends" name="endsAt" type="datetime-local" />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-ink-soft">Se guarda en tu zona horaria local.</p>
        <div>
          <Label htmlFor="e-desc">Detalles (opcional)</Label>
          <Textarea id="e-desc" name="description" rows={2} maxLength={500} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="showCountdown"
            defaultChecked
            className="h-4 w-4 rounded border-sand-deep accent-rose"
          />
          Mostrar countdown en el inicio
        </label>
        <FieldError>{state.error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}
