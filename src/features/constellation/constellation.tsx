"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarHeart, Camera, Maximize2, Minus, Plus, Quote, Sparkles, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StarType = "photo" | "recuerdo" | "cita" | "frase";
export type Star = {
  id: string;
  type: StarType;
  date: string; // ISO
  title?: string | null;
  text?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  kind?: string;
};

type Level = "year" | "month" | "detail";

const DAY = 86_400_000;
const PX_PER_DAY = 7;
const Y_SPREAD = 200; // dispersión vertical de las estrellas (unidades de mundo)
const MIN_K = 0.04;
const MAX_K = 5;
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// hash determinista de un id → [0,1). Da a cada estrella una posición vertical
// estable (no salta entre renders).
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function levelFor(k: number): Level {
  if (k < 0.34) return "year";
  if (k < 1.2) return "month";
  return "detail";
}

const TYPE_BAND: Record<StarType, number> = { photo: -46, recuerdo: -12, cita: 22, frase: 58 };

export function Constellation({
  stars,
  since,
  you,
  partner
}: {
  stars: Star[];
  since: string;
  you: string;
  partner: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef({ px: 0, py: 0, k: 0.3 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const [level, setLevel] = useState<Level>("year");
  const [ready, setReady] = useState(false);
  // portal a document.body: un overlay inmersivo debe escapar de los contextos
  // de apilamiento del layout (si no, el raíl z-40 se pinta por encima).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ----- geometría: posiciones en el mundo a partir de las fechas -----
  const { nodes, t0, worldW, years, months } = useMemo(() => {
    const times = stars.map((s) => new Date(s.date).getTime());
    const now = Date.now();
    const minT = Math.min(new Date(since).getTime(), ...(times.length ? times : [now]));
    const maxT = Math.max(now, ...(times.length ? times : [now]));
    // t0 al inicio del mes del primer dato; pad al final
    const start = new Date(minT);
    const t0 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    const worldW = ((maxT - t0) / DAY) * PX_PER_DAY + 400;

    const nodes = stars.map((s) => {
      const t = new Date(s.date).getTime();
      const x = ((t - t0) / DAY) * PX_PER_DAY + 60;
      const y = (hash01(s.id) - 0.5) * 2 * Y_SPREAD + TYPE_BAND[s.type] + (hash01(s.id + "y") - 0.5) * 40;
      return { star: s, x, y };
    });

    // etiquetas de año y de mes
    const years: { label: number; x: number }[] = [];
    const months: { label: string; x: number; first: boolean }[] = [];
    const d0 = new Date(t0);
    const y0 = d0.getUTCFullYear();
    const y1 = new Date(maxT).getUTCFullYear();
    for (let y = y0; y <= y1; y++) {
      years.push({ label: y, x: ((Date.UTC(y, 0, 1) - t0) / DAY) * PX_PER_DAY + 60 });
      for (let m = 0; m < 12; m++) {
        const mt = Date.UTC(y, m, 1);
        if (mt < t0 - DAY || mt > maxT + DAY) continue;
        months.push({ label: MONTHS_ES[m], x: ((mt - t0) / DAY) * PX_PER_DAY + 60, first: m === 0 });
      }
    }
    return { nodes, t0, worldW, years, months };
  }, [stars, since]);

  const linePoints = useMemo(
    () => nodes.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(" "),
    [nodes]
  );

  // ----- aplicar la vista via variables CSS (paneo sin re-render) -----
  const applyView = useCallback(() => {
    const el = worldRef.current;
    if (!el) return;
    el.style.setProperty("--px", `${view.current.px}px`);
    el.style.setProperty("--py", `${view.current.py}px`);
    el.style.setProperty("--k", `${view.current.k}`);
  }, []);

  const zoomTo = useCallback(
    (nextK: number, sx: number, sy: number) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, nextK));
      const { px, py, k: k0 } = view.current;
      // mantener el punto (sx,sy) de la pantalla fijo al hacer zoom
      const wx = (sx - px) / k0;
      const wy = (sy - py) / k0;
      view.current = { k, px: sx - wx * k, py: sy - wy * k };
      applyView();
      const lv = levelFor(k);
      setLevel((prev) => (prev === lv ? prev : lv));
    },
    [applyView]
  );

  const fitAll = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const vw = wrap.clientWidth;
    const vh = wrap.clientHeight;
    const k = Math.min(MAX_K, Math.max(MIN_K, (vw * 0.86) / worldW));
    view.current = { k, px: vw / 2 - (worldW / 2) * k, py: vh / 2 };
    applyView();
    setLevel(levelFor(k));
  }, [worldW, applyView]);

  // El ajuste inicial y los listeners corren SOLO cuando el portal ya montó el
  // wrapRef (si no, el ref es null y salen temprano). Por eso dependen de
  // `mounted`.
  useEffect(() => {
    if (!mounted) return;
    fitAll();
    setReady(true);
  }, [mounted, fitAll]);

  // Bloquear el scroll del cuerpo mientras el cielo está abierto (es inmersivo)
  // y capturar la rueda sin passive para poder cancelar el scroll/zoom del
  // navegador y usarla para el zoom del cielo.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = wrapRef.current;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0016);
      zoomTo(view.current.k * factor, e.clientX, e.clientY);
    };
    el?.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      document.body.style.overflow = prev;
      el?.removeEventListener("wheel", onWheelNative);
    };
  }, [mounted, zoomTo]);

  // ----- punteros: arrastrar para mover, pellizcar para zoom -----
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2
      };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, px: view.current.px, py: view.current.py };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const ratio = dist / (pinch.current.dist || dist);
      zoomTo(view.current.k * ratio, cx, cy);
      pinch.current = { dist, cx, cy };
      return;
    }

    if (drag.current) {
      view.current.px = drag.current.px + (e.clientX - drag.current.x);
      view.current.py = drag.current.py + (e.clientY - drag.current.y);
      applyView();
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  const zoomButton = (mult: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    zoomTo(view.current.k * mult, wrap.clientWidth / 2, wrap.clientHeight / 2);
  };

  if (!mounted) return null;

  if (stars.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[#0d0a18] px-6 text-center text-white">
        <Sparkles className="h-10 w-10 text-rose/70" />
        <h1 className="font-display text-3xl">Vuestra constelación está por nacer</h1>
        <p className="max-w-sm text-sm text-white/70">
          Con cada foto, cita, recuerdo y frase que guardéis, se encenderá una estrella. Volved
          cuando tengáis vuestros primeros recuerdos.
        </p>
        <Link
          href="/recuerdos"
          className="mt-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/20"
        >
          Volver
        </Link>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      className="fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-[radial-gradient(120%_120%_at_50%_-10%,#241a3a_0%,#140f24_45%,#0b0816_100%)]"
      style={{ cursor: "grab" }}
    >
      {/* estrellas de fondo decorativas (cielo) */}
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_20%_30%,#fff,transparent),radial-gradient(1px_1px_at_70%_60%,#fff,transparent),radial-gradient(1px_1px_at_40%_80%,#fff,transparent),radial-gradient(1px_1px_at_85%_25%,#fff,transparent),radial-gradient(1px_1px_at_55%_15%,#fff,transparent),radial-gradient(1px_1px_at_10%_65%,#fff,transparent)] [background-size:100%_100%]" />

      {/* el mundo: se transforma con variables CSS (paneo/zoom sin re-render) */}
      <div
        ref={worldRef}
        className={cn(
          "absolute left-0 top-0 origin-top-left transition-opacity duration-500 will-change-transform",
          ready ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: "translate(var(--px, 0px), var(--py, 0px)) scale(var(--k, 0.3))" }}
      >
        {/* hilo de la constelación */}
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
          <polyline
            points={linePoints}
            fill="none"
            stroke="rgb(242 139 154 / 0.35)"
            strokeWidth={1.25}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* etiquetas de año (siempre) */}
        {years.map((y) => (
          <div
            key={y.label}
            className="pointer-events-none absolute -translate-x-1/2"
            style={{ left: y.x, top: -Y_SPREAD - 120 }}
          >
            <span
              className="block font-display font-semibold leading-none text-white/12"
              style={{ fontSize: 120 }}
            >
              {y.label}
            </span>
          </div>
        ))}

        {/* etiquetas de mes (mes y detalle) */}
        {level !== "year" &&
          months.map((m) => (
            <div
              key={`${m.label}-${m.x}`}
              className="pointer-events-none absolute -translate-x-1/2"
              style={{ left: m.x, top: Y_SPREAD + 30 }}
            >
              <span
                className="block uppercase tracking-widest text-white/25"
                style={{ fontSize: 13, transform: "scale(calc(1 / var(--k, 1)))", transformOrigin: "top center" }}
              >
                {m.label}
              </span>
            </div>
          ))}

        {/* las estrellas */}
        {nodes.map((n) => (
          <StarNode key={n.star.id} x={n.x} y={n.y} star={n.star} level={level} />
        ))}
      </div>

      {/* ---- interfaz fija ---- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5">
        <div className="pointer-events-none">
          <p className="flex items-center gap-2 font-display text-xl text-white">
            <Sparkles className="h-5 w-5 text-rose" /> Vuestra constelación
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            {you}
            {partner ? ` y ${partner}` : ""} · {stars.length} estrellas
          </p>
        </div>
        <Link
          href="/recuerdos"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </Link>
      </header>

      {/* leyenda + nivel */}
      <div className="pointer-events-none absolute bottom-5 left-5 flex flex-col gap-2 text-xs text-white/60">
        <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
          {level === "year" ? "Los años" : level === "month" ? "Los meses" : "El detalle"} · arrastra
          para moverte, rueda o pellizca para acercar
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1">
          <Legend icon={Camera} label="fotos" />
          <Legend icon={CalendarHeart} label="citas" />
          <Legend icon={Quote} label="frases" />
          <Legend icon={StickyNote} label="recuerdos" />
        </div>
      </div>

      {/* controles de zoom */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-2">
        <ZoomButton onClick={() => zoomButton(1.5)} label="Acercar">
          <Plus className="h-5 w-5" />
        </ZoomButton>
        <ZoomButton onClick={() => zoomButton(1 / 1.5)} label="Alejar">
          <Minus className="h-5 w-5" />
        </ZoomButton>
        <ZoomButton onClick={fitAll} label="Ver todo">
          <Maximize2 className="h-4 w-4" />
        </ZoomButton>
      </div>
    </div>,
    document.body
  );
}

function Legend({ icon: Icon, label }: { icon: typeof Camera; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function ZoomButton({
  onClick,
  label,
  children
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
    >
      {children}
    </button>
  );
}

// Una estrella. Su contenido se contra-escala (1/k) para mantener un tamaño
// constante en pantalla mientras su posición sí escala con el tiempo. El nivel
// de detalle (punto / miniatura / detalle) lo decide el zoom semántico.
function StarNode({ x, y, star, level }: { x: number; y: number; star: Star; level: Level }) {
  const isPhoto = star.type === "photo" && star.imageUrl;
  const glow =
    star.type === "photo"
      ? "bg-rose"
      : star.type === "cita"
        ? "bg-amber-300"
        : star.type === "frase"
          ? "bg-violet-300"
          : "bg-sky-300";

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <div
        className="flex flex-col items-center"
        style={{ transform: "scale(calc(1 / var(--k, 1)))", transformOrigin: "center" }}
      >
        {level === "year" || (level === "month" && !isPhoto) || (level !== "detail" && star.type === "frase") ? (
          // punto-estrella
          <span className={cn("block h-2 w-2 rounded-full shadow-[0_0_8px_2px] shadow-white/20", glow)} />
        ) : isPhoto ? (
          // miniatura de foto (crece en detalle)
          <figure className="overflow-hidden rounded-lg ring-1 ring-white/25 shadow-[0_0_14px_2px_rgba(242,139,154,0.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={star.imageUrl!}
              alt={star.title ?? "Momento"}
              draggable={false}
              className="block object-cover"
              style={{ width: level === "detail" ? 88 : 52, height: level === "detail" ? 88 : 52 }}
            />
            {level === "detail" && (star.title || star.text) && (
              <figcaption className="max-w-[88px] bg-black/55 px-1.5 py-1 text-[8px] leading-tight text-white/85">
                {star.title ?? star.text}
              </figcaption>
            )}
          </figure>
        ) : star.type === "cita" ? (
          <span className="flex flex-col items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-300/20 text-amber-200 ring-1 ring-amber-200/40">
              <CalendarHeart className="h-3.5 w-3.5" />
            </span>
            {level === "detail" && star.title && (
              <span className="max-w-[120px] text-center text-[9px] font-medium leading-tight text-amber-100/90">
                {star.title}
              </span>
            )}
          </span>
        ) : star.type === "recuerdo" ? (
          <span className="flex flex-col items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-300/20 text-sky-200 ring-1 ring-sky-200/40">
              <StickyNote className="h-3 w-3" />
            </span>
            {level === "detail" && star.text && (
              <span className="max-w-[130px] text-center text-[9px] leading-tight text-sky-100/85">
                {star.text}
              </span>
            )}
          </span>
        ) : (
          // frase (solo en detalle)
          <span className="flex max-w-[150px] flex-col items-center gap-1 text-center">
            <Quote className="h-3 w-3 text-violet-200/80" />
            <span className="text-[9px] italic leading-tight text-violet-100/90">
              {star.text}
            </span>
            {star.author && <span className="text-[7px] text-white/40">— {star.author}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
