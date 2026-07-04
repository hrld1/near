"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Copy, Ticket } from "lucide-react";
import { createInviteAction, redeemInviteAction } from "@/actions/couple";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function RedeemButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full">
      Vincularnos
    </Button>
  );
}

export function LinkPartner() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [redeemState, redeem] = useFormState(redeemInviteAction, {});

  // Quien invita se queda esperando: sondeamos hasta que exista la pareja.
  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [code, router]);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await createInviteAction();
      if (result.ok && result.data) setCode(result.data.code);
      else if (!result.ok) setError(result.error);
    });
  }

  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="font-display text-xl text-ink">Invita a tu pareja</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Genera un codigo y compartelo. Cuando lo use, vuestro espacio se
          creara automaticamente.
        </p>
        {code ? (
          <div className="mt-4">
            <button
              onClick={copy}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-rose/50 bg-rose-faint px-4 py-3.5 font-mono text-lg tracking-widest text-rose-deep transition hover:bg-rose-soft"
            >
              {code}
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Esperando a que tu pareja use el codigo... esta pagina se
              actualizara sola.
            </p>
          </div>
        ) : (
          <Button onClick={generate} loading={pending} className="mt-4">
            <Ticket className="h-4 w-4" />
            Generar codigo
          </Button>
        )}
        <FieldError>{error ?? undefined}</FieldError>
      </Card>

      <div className="flex items-center gap-3 px-2 text-xs uppercase tracking-widest text-ink-soft">
        <span className="h-px flex-1 bg-sand-deep" /> o <span className="h-px flex-1 bg-sand-deep" />
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl text-ink">Tengo un codigo</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Tu pareja ya creo uno? Pegalo aqui.
        </p>
        <form action={redeem} className="mt-4 space-y-3">
          <Input
            name="code"
            placeholder="NEAR-XXXXXX"
            className="text-center font-mono uppercase tracking-widest"
            autoComplete="off"
            required
          />
          <FieldError>{redeemState.error}</FieldError>
          <RedeemButton />
        </form>
      </Card>
    </div>
  );
}
