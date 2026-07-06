"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEventAction } from "@/actions/calendar";

export function DeleteEvent({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      title="Borrar"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Borrar este evento?")) return;
        startTransition(async () => {
          await deleteEventAction(id);
          router.refresh();
        });
      }}
      className="rounded-lg p-1.5 text-ink-soft/60 opacity-0 transition hover:bg-sand hover:text-red-700 dark:text-red-400 group-hover:opacity-100 disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
