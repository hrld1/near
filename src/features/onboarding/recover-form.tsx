"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { redeemRecoveryAction } from "@/actions/security";
import { Button } from "@/components/ui/button";

export function RecoverForm({ token }: { token: string }) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (next !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    startTransition(async () => {
      const result = await redeemRecoveryAction(token, next);
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Check className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm text-ink">Listo. Ya puedes entrar con tu nueva contraseña.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-rose px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-deep"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="Nueva contraseña (mín. 8)"
        autoComplete="new-password"
        className="w-full rounded-xl border border-sand-deep bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repítela"
        autoComplete="new-password"
        className="w-full rounded-xl border border-sand-deep bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none"
      />
      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
      <Button className="w-full" loading={pending} disabled={next.length < 8} onClick={submit}>
        Guardar y recuperar acceso
      </Button>
    </div>
  );
}
