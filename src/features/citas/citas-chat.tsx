"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Shield, Sparkles } from "lucide-react";
import type { DatePlanData } from "@/lib/citas";
import { planSchema } from "@/lib/citas";
import { cn } from "@/lib/utils";
import { ItineraryCard } from "./itinerary-card";

// El chat con la planificadora. La conversación vive en el cliente (no se
// persiste); el servidor la recibe entera en cada turno y responde en
// streaming SSE con eventos {text | plan | error | done}.

type ChatMsg = { role: "user" | "assistant"; content: string; plan?: DatePlanData };

const SUGGESTIONS = [
  "Sorpréndeme con una cita en su ciudad ✨",
  "Planea nuestra cita de reencuentro 💫",
  "Un viernes a distancia sin salir de casa 🛋️",
  "Cita barata y bonita para este finde"
];

const PRIVACY_KEY = "near:citas-privacy-ok";

export function CitasChat({ partnerName }: { partnerName: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyOk, setPrivacyOk] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrivacyOk(window.localStorage.getItem(PRIVACY_KEY) === "1");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function acceptPrivacy() {
    window.localStorage.setItem(PRIVACY_KEY, "1");
    setPrivacyOk(true);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setBusy(true);
    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");

    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.content.trim().length > 0)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
        })
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setMessages(history); // quita la burbuja vacía
        setError(data?.error ?? "La planificadora no responde ahora mismo.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const handle = (raw: string) => {
        if (!raw.startsWith("data: ")) return;
        let event: { type: string; text?: string; plan?: unknown; error?: string };
        try {
          event = JSON.parse(raw.slice(6));
        } catch {
          return;
        }
        if (event.type === "text" && event.text) {
          setMessages((ms) => {
            const next = [...ms];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, content: last.content + event.text };
            return next;
          });
        } else if (event.type === "plan") {
          const plan = planSchema.safeParse(event.plan);
          if (plan.success) {
            setMessages((ms) => {
              const next = [...ms];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { ...last, plan: plan.data };
              return next;
            });
          }
        } else if (event.type === "error" && event.error) {
          setError(event.error);
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          handle(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 2);
        }
      }
    } catch {
      setError("Se ha cortado la conexión. Prueba otra vez.");
    } finally {
      setBusy(false);
    }
  }

  if (!privacyOk) {
    return (
      <div className="rounded-2xl border border-sand-deep bg-paper p-5 text-center shadow-card">
        <Shield className="mx-auto h-8 w-8 text-plum" />
        <h2 className="mt-2 font-display text-xl text-ink">Antes de empezar</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Lo que escribas aquí se procesa con <b>Claude (Anthropic)</b> para planear la cita. No se usa para
          entrenar modelos y la conversación no se guarda en Near: solo el plan, si decides proponerlo. La
          planificadora sugiere sitios reales con sus fuentes, pero <b>no reserva nada</b>: comprobad siempre
          horarios y disponibilidad.
        </p>
        <button
          onClick={acceptPrivacy}
          className="mt-4 rounded-full bg-rose px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-deep"
        >
          Entendido, a planear 💘
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-paper shadow-card">
      <div className="max-h-[60vh] min-h-[340px] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose/12 text-rose-deep">
              <Sparkles className="h-8 w-8" />
            </span>
            <p className="max-w-sm text-sm text-ink-soft">
              Cuéntame qué cita os apetece — juntos en una ciudad o a distancia — y os la dejo planeada y lista
              para proponer.
            </p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-rose/30 bg-rose-faint px-3.5 py-1.5 text-sm text-ink transition hover:border-rose hover:bg-rose/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] space-y-2", m.role === "user" && "text-right")}>
              {m.content && (
                <div
                  className={cn(
                    "inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed text-ink",
                    m.role === "user" ? "rounded-br-md bg-sand" : "rounded-bl-md bg-rose-faint"
                  )}
                >
                  {m.content}
                  {busy && i === messages.length - 1 && m.role === "assistant" && (
                    <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-rose/60 align-middle" />
                  )}
                </div>
              )}
              {!m.content && busy && i === messages.length - 1 && m.role === "assistant" && (
                <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-rose-faint px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose [animation-delay:240ms]" />
                </div>
              )}
              {m.plan && (
                <div className="text-left">
                  <ItineraryCard plan={m.plan} partnerName={partnerName} proposable />
                </div>
              )}
            </div>
          </div>
        ))}
        {error && <p className="text-center text-xs text-red-700 dark:text-red-400">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-sand p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={`Una cita con ${partnerName}…`}
          className="max-h-32 flex-1 resize-none rounded-xl border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Enviar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose text-white transition hover:bg-rose-deep disabled:opacity-50"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
