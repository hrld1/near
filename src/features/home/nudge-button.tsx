"use client";

import { useState, useTransition } from "react";
import { Check, Heart } from "lucide-react";
import { sendNudgeAction } from "@/actions/presence";
import { useCoupleStream } from "@/hooks/use-stream";
import { cn } from "@/lib/utils";

export function NudgeButton({
  partnerName,
  lastNudge
}: {
  partnerName: string;
  // último "pensando en ti" que enviaste (para pintar el visto)
  lastNudge: { id: string; seen: boolean } | null;
}) {
  const [sent, setSent] = useState(false);
  const [nudgeId, setNudgeId] = useState<string | null>(lastNudge?.id ?? null);
  const [seen, setSeen] = useState(lastNudge?.seen ?? false);
  const [pending, startTransition] = useTransition();

  useCoupleStream((event) => {
    if (event.type !== "nudge:seen") return;
    if (event.payload.nudgeId === nudgeId) setSeen(true);
  });

  function send() {
    startTransition(async () => {
      const result = await sendNudgeAction();
      if (result.ok) {
        setSent(true);
        setSeen(false);
        setNudgeId(result.data?.id ?? null);
        setTimeout(() => setSent(false), 60_000);
      }
    });
  }

  return (
    <div>
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
      {seen && nudgeId && (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-rose-deep">
          <Check className="h-3 w-3" /> {partnerName} lo ha visto
        </p>
      )}
    </div>
  );
}
