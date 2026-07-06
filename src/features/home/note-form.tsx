"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveNoteAction } from "@/actions/presence";
import { Textarea, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" variant="secondary" type="submit" loading={pending}>
      Guardar nota
    </Button>
  );
}

export function NoteForm({ current }: { current: string | null }) {
  const [state, action] = useFormState(saveNoteAction, {});
  return (
    <form action={action} className="space-y-2.5">
      <Textarea
        name="body"
        rows={2}
        maxLength={280}
        defaultValue={current ?? ""}
        placeholder="Deja una nota que tu pareja verá en su inicio..."
        required
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-emerald-700 dark:text-emerald-400">{state.success}</span>
        <SaveButton />
      </div>
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
