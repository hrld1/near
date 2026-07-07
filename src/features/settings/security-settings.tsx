"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, LifeBuoy } from "lucide-react";
import { changePasswordAction, createRecoveryTokenForPartnerAction } from "@/actions/security";
import { Button } from "@/components/ui/button";

// Contraseña (cambiarla desde dentro) + recuperación asistida por la pareja.
export function SecuritySettings({ partnerName }: { partnerName: string | null }) {
  return (
    <div className="space-y-5">
      <ChangePassword />
      {partnerName && <PartnerRecovery partnerName={partnerName} />}
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    startTransition(async () => {
      const result = await changePasswordAction(current, next);
      if (result.ok) {
        setMsg({ ok: true, text: "Contraseña actualizada" });
        setCurrent("");
        setNext("");
      } else {
        setMsg({ ok: false, text: result.error });
      }
    });
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <KeyRound className="h-4 w-4 text-ink-soft" /> Cambiar contraseña
      </p>
      <div className="mt-2 space-y-2">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Contraseña actual"
          autoComplete="current-password"
          className="w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Nueva contraseña (mín. 8)"
          autoComplete="new-password"
          className="w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none"
        />
        <Button size="sm" loading={pending} disabled={!current || next.length < 8} onClick={save}>
          Guardar contraseña
        </Button>
        {msg && (
          <p className={msg.ok ? "text-xs font-medium text-emerald-600" : "text-xs text-red-700 dark:text-red-400"}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

function PartnerRecovery({ partnerName }: { partnerName: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await createRecoveryTokenForPartnerAction();
      if (result.ok && result.data) {
        setLink(`${window.location.origin}/recover?token=${result.data.token}`);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-t border-sand pt-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <LifeBuoy className="h-4 w-4 text-ink-soft" /> Ayudar a {partnerName} a entrar
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Si {partnerName} pierde el acceso, genérale un enlace y pásaselo. Le sirve
        una hora para poner una contraseña nueva. Solo tú puedes hacerlo.
      </p>
      {link ? (
        <div className="mt-2">
          <button
            onClick={copy}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-rose/50 bg-rose-faint px-3 py-2.5 text-left text-xs text-rose-deep transition hover:bg-rose-soft"
          >
            <span className="truncate">{link}</span>
            {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
          </button>
          <p className="mt-1.5 text-[11px] text-ink-soft">Válido 1 hora. Un solo uso.</p>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-2" loading={pending} onClick={generate}>
          Generar enlace de recuperación
        </Button>
      )}
      {error && <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
