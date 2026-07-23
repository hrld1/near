"use client";

import { useState } from "react";
import { useServerState } from "@/hooks/use-server-state";
import { HeartHandshake, Sparkles } from "lucide-react";
import { sendAppreciationAction } from "@/actions/appreciation";
import { useCoupleStream } from "@/hooks/use-stream";
import { agoLabel } from "@/lib/format";
import { sfx, vibrate } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyJarIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

type Appr = { id: string; fromId: string; fromName: string; body: string; createdAt: string };

// El frasco de aprecio: escribes algo que admiras de tu pareja y cae al frasco;
// los aprecios se acumulan y los dos pueden reabrirlos. Los suyos llegan en vivo.
export function AppreciationBox({
  myId,
  myName,
  partnerName,
  initial
}: {
  myId: string;
  myName: string;
  partnerName: string;
  initial: Appr[];
}) {
  const [list, setList] = useServerState<Appr[]>(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  useCoupleStream((event) => {
    if (event.type !== "appreciation:new") return;
    const p = event.payload;
    if (p.fromId === myId) return; // el eco del mío ya lo añadí optimista
    setList((l) => [
      { id: p.id, fromId: p.fromId, fromName: p.fromName, body: p.body, createdAt: new Date().toISOString() },
      ...l
    ]);
    sfx.message();
    vibrate(20);
  });

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const res = await sendAppreciationAction({ body: text });
    if (res.ok && res.data) {
      setList((l) => [
        { id: res.data!.id, fromId: myId, fromName: myName, body: text, createdAt: res.data!.createdAt },
        ...l
      ]);
      setBody("");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 1800);
      sfx.success();
      vibrate(20);
    } else if (!res.ok) {
      setError(res.error);
    }
    setSending(false);
  }

  return (
    <div>
      <div className="rounded-2xl border border-rose/20 bg-gradient-to-br from-rose-faint via-paper to-paper p-4 shadow-card">
        <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-rose-deep">
          <HeartHandshake className="h-4 w-4" /> Dile algo que admiras de {partnerName}
        </p>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder={`Algo que valoras, agradeces o te encanta de ${partnerName}…`}
          className="mt-3"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className={cn("text-xs transition", justSent ? "font-medium text-rose-deep" : "text-ink-soft")}>
            {justSent ? "Guardado en el frasco" : "Se guarda para siempre en vuestro frasco."}
          </p>
          <Button size="sm" onClick={send} loading={sending} disabled={!body.trim()}>
            Meter en el frasco
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <Sparkles className="h-3.5 w-3.5 text-rose" /> Vuestro frasco
          <span className="text-ink-soft/70">· {list.length}</span>
        </p>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-deep bg-paper/60 px-4 py-6 text-center">
            <EmptyJarIllustration className="h-16 w-16" />
            <p className="text-sm text-ink-soft">El frasco está vacío. El primer aprecio siempre emociona.</p>
          </div>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {list.map((a) => {
              const mine = a.fromId === myId;
              return (
                <li
                  key={a.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 shadow-card",
                    mine
                      ? "border-sand-deep bg-sand"
                      : "border-rose/20 bg-rose-faint"
                  )}
                >
                  <p className="text-read text-ink">“{a.body}”</p>
                  <p className="mt-1.5 text-2xs text-ink-soft">
                    <span className={cn("font-semibold", mine ? "text-ink" : "text-rose-deep")}>
                      {mine ? "Tú" : a.fromName}
                    </span>{" "}
                    · {agoLabel(new Date(a.createdAt))}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
