"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { sendNudgeAction } from "@/actions/presence";
import { cn } from "@/lib/utils";

export function NudgeButton({ partnerName }: { partnerName: string }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendNudgeAction();
      if (result.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 60_000);
      }
    });
  }

  return (
    <button
      onClick={send}
      disabled={sent || pending}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition",
        sent
          ? "border-rose/30 bg-rose-faint text-rose-deep"
          : "border-sand-deep bg-paper text-ink hover:border-rose/40 hover:bg-rose-faint hover:text-rose-deep"
      )}
    >
      <Heart className={cn("h-4 w-4", sent && "animate-pulse-heart fill-rose text-rose")} />
      {sent ? `${partnerName} lo sabra en un segundo` : "Estoy pensando en ti"}
    </button>
  );
}
