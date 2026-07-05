"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { touchSignalAction } from "@/actions/touch";
import { cn } from "@/lib/utils";

// Abre la superficie de Tacto y, de paso, avisa a la pareja para que se una.
export function TouchButton({ partnerName }: { partnerName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      await touchSignalAction({ kind: "invite" });
      router.push("/touch");
    });
  }

  return (
    <button
      onClick={go}
      disabled={pending}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border border-sand-deep bg-paper px-4 py-3 text-sm font-medium text-ink transition",
        "hover:border-rose/40 hover:bg-rose-faint hover:text-rose-deep disabled:opacity-60"
      )}
    >
      <Fingerprint className="h-4 w-4" />
      Tocar a {partnerName}
    </button>
  );
}
