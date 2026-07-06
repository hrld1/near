"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (now === null) {
    return <div className="h-16 animate-pulse rounded-xl bg-sand" />;
  }

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) {
    return <p className="font-display text-3xl text-rose-deep">Ya esta aquí</p>;
  }

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const cells = [
    { value: String(days), label: days === 1 ? "día" : "días" },
    { value: pad(hours), label: "horas" },
    { value: pad(minutes), label: "min" },
    { value: pad(seconds), label: "seg" }
  ];

  return (
    <div className="flex items-end gap-3">
      {cells.map((cell) => (
        <div key={cell.label} className="text-center">
          <div className="min-w-[3.25rem] rounded-xl bg-rose-faint px-2 py-2 font-display text-3xl tabular-nums text-rose-deep">
            {cell.value}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-soft">
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}
