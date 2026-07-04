"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Moon, Sun, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const PADS = [
  { key: 0, base: "bg-rose/25 text-rose", lit: "bg-rose text-white", Icon: Heart },
  { key: 1, base: "bg-plum/25 text-plum", lit: "bg-plum text-white", Icon: Moon },
  { key: 2, base: "bg-amber-400/25 text-amber-500", lit: "bg-amber-400 text-white", Icon: Sun },
  { key: 3, base: "bg-sky-400/25 text-sky-500", lit: "bg-sky-400 text-white", Icon: Waves }
];

export function EchoGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [showing, setShowing] = useState(true);
  const [failed, setFailed] = useState(false);
  const roundsRef = useRef(0);

  useEffect(() => {
    addStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addStep() {
    setSequence((prev) => {
      const next = [...prev, Math.floor(Math.random() * 4)];
      void playback(next);
      return next;
    });
  }

  async function playback(seq: number[]) {
    setShowing(true);
    setInputIndex(0);
    await sleep(600);
    for (const pad of seq) {
      setLit(pad);
      await sleep(Math.max(220, 460 - seq.length * 18));
      setLit(null);
      await sleep(140);
    }
    setShowing(false);
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function press(pad: number) {
    if (showing || failed) return;
    setLit(pad);
    setTimeout(() => setLit(null), 200);
    if (pad !== sequence[inputIndex]) {
      setFailed(true);
      setTimeout(() => onFinish(roundsRef.current), 1000);
      return;
    }
    const next = inputIndex + 1;
    if (next >= sequence.length) {
      roundsRef.current = sequence.length;
      await sleep(500);
      addStep();
    } else {
      setInputIndex(next);
    }
  }

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center gap-5 p-5">
      <p
        className={cn(
          "text-sm font-medium",
          failed ? "text-red-600" : showing ? "text-ink-soft" : "text-emerald-600"
        )}
      >
        {failed
          ? `Fin: ${roundsRef.current} rondas completadas`
          : showing
            ? "Memoriza la secuencia..."
            : "Tu turno"}
      </p>
      <div className={cn("grid grid-cols-2 gap-3", failed && "animate-shake")}>
        {PADS.map((pad) => (
          <button
            key={pad.key}
            onPointerDown={() => press(pad.key)}
            disabled={showing || failed}
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-2xl transition-all duration-150 sm:h-32 sm:w-32",
              lit === pad.key ? `${pad.lit} scale-105 shadow-lift` : pad.base,
              !showing && !failed && "hover:scale-[1.02] active:scale-95"
            )}
          >
            <pad.Icon className="h-9 w-9" />
          </button>
        ))}
      </div>
      <p className="font-display text-2xl text-ink">Ronda {Math.max(1, sequence.length)}</p>
    </div>
  );
}
