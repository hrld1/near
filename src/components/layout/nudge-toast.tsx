"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { markNudgeSeenAction } from "@/actions/presence";
import { useCoupleStream } from "@/hooks/use-stream";

export function NudgeToast({ myId }: { myId: string }) {
  const [message, setMessage] = useState<string | null>(null);

  useCoupleStream((event) => {
    if (event.type !== "nudge") return;
    if (event.payload.fromId === myId) return;
    setMessage(`${event.payload.fromName} esta pensando en ti`);
    // mostrar el toast = visto (el emisor lo ve en vivo)
    void markNudgeSeenAction(event.payload.id);
  });

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timeout);
  }, [message]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div className="flex animate-fade-up items-center gap-2.5 rounded-full border border-rose/20 bg-paper px-5 py-3 shadow-lift">
        <Heart className="h-4 w-4 animate-pulse-heart fill-rose text-rose" />
        <span className="text-sm font-medium text-ink">{message}</span>
      </div>
    </div>
  );
}
