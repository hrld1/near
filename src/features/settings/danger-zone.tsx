"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, HeartOff, Trash2 } from "lucide-react";
import { deleteAccountAction, dissolveCoupleAction } from "@/actions/account";
import { Button } from "@/components/ui/button";

// Zona delicada: desvincularse o borrar la cuenta. Ambas son irreversibles y
// afectan a los dos, así que cada una pide escribir una palabra para confirmar
// y recuerda que se puede exportar antes.
function ConfirmAction({
  icon,
  title,
  description,
  confirmWord,
  actionLabel,
  onConfirm
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  confirmWord: string;
  actionLabel: string;
  onConfirm: (value: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(value);
      if (!result.ok) setError(result.error ?? "No se pudo completar");
    });
  }

  return (
    <div className="rounded-2xl border border-red-300/50 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/10">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{description}</p>

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 text-sm font-medium text-red-600 transition hover:text-red-700 dark:text-red-400"
            >
              {actionLabel}
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-xs text-ink-soft">
                Escribe <b className="text-red-600 dark:text-red-400">{confirmWord}</b> para confirmar
              </label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-red-300 bg-paper px-3 py-2 text-sm text-ink focus:border-red-500 focus:outline-none dark:border-red-900/50"
              />
              {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  loading={pending}
                  disabled={value.trim().toUpperCase() !== confirmWord}
                  onClick={run}
                >
                  {actionLabel}
                </Button>
                <button
                  onClick={() => {
                    setOpen(false);
                    setValue("");
                    setError(null);
                  }}
                  className="rounded-full px-3 text-sm font-medium text-ink-soft transition hover:text-ink"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DangerZone({ partnerName }: { partnerName: string | null }) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Antes de nada, podéis{" "}
        <a href="/api/export" download className="font-medium text-rose-deep underline">
          descargar todo lo vuestro
        </a>
        .
      </p>

      {partnerName && (
        <ConfirmAction
          icon={<HeartOff className="h-4 w-4" />}
          title="Desvincularnos"
          description={`Disuelve vuestro espacio y borra todo lo compartido con ${partnerName} — para los dos. No se puede deshacer.`}
          confirmWord="DESVINCULAR"
          actionLabel="Desvincularnos"
          onConfirm={async (value) => {
            const result = await dissolveCoupleAction(value);
            if (result.ok) {
              router.push("/onboarding");
              router.refresh();
            }
            return result;
          }}
        />
      )}

      <ConfirmAction
        icon={<Trash2 className="h-4 w-4" />}
        title="Borrar mi cuenta"
        description="Elimina tu cuenta y disuelve vuestro espacio compartido. No se puede deshacer."
        confirmWord="BORRAR"
        actionLabel="Borrar mi cuenta"
        onConfirm={(value) => deleteAccountAction(value)}
      />
    </div>
  );
}
