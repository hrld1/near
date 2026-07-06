"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { redeemByCodeAction } from "@/actions/couple";

// Ya hay sesión iniciada y aún no hay pareja: canjeamos el código del enlace
// automáticamente y entramos a casa.
export function JoinRedeem({ code, inviterName }: { code: string; inviterName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void redeemByCodeAction(code).then((res) => {
      if (res.ok) router.replace("/home");
      else setError(res.error);
    });
  }, [code, router]);

  if (error) {
    return (
      <div className="text-center">
        <p className="text-sm text-rose-deep">{error}</p>
        <Link
          href="/onboarding"
          className="mt-4 inline-block text-sm font-medium text-rose hover:underline"
        >
          Ir a vincular pareja
        </Link>
      </div>
    );
  }

  return (
    <p className="flex items-center justify-center gap-2 text-sm text-ink-soft">
      <Loader2 className="h-4 w-4 animate-spin" />
      Uniendo tu cuenta con la de {inviterName}…
    </p>
  );
}
