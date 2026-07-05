"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import type { MonthlyRecap } from "@/lib/recap";

const W = 1080;
const H = 1350;

// Tarjeta "vuestro mes" dibujada sobre canvas (sin librerías): se ve en
// pantalla y se exporta como PNG para compartir. Colores fijos: es una imagen
// autónoma, independiente del tema de la app.
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function MonthRecap({
  recap,
  me,
  partner
}: {
  recap: MonthlyRecap;
  me: string;
  partner: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "canShare" in navigator);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (photo?: HTMLImageElement) => {
      // fondo
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#fff1f2");
      bg.addColorStop(1, "#ffe4e6");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      ctx.fillStyle = "#9f1239";
      ctx.font = "600 62px Georgia, serif";
      ctx.fillText("Vuestro mes en Near", W / 2, 150);

      ctx.fillStyle = "#e11d48";
      ctx.font = "500 42px Georgia, serif";
      const month = recap.monthLabel.charAt(0).toUpperCase() + recap.monthLabel.slice(1);
      ctx.fillText(month, W / 2, 218);

      ctx.fillStyle = "#881337";
      ctx.font = "600 40px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(`${me}  &  ${partner}`, W / 2, 300);

      // tiles 2x2
      const tiles = [
        { big: String(recap.messages), label: "Mensajes" },
        {
          big: String(recap.streak),
          label: recap.streak === 1 ? "día de racha" : "días de racha"
        },
        { big: String(recap.photos), label: "Fotos del día" },
        {
          big: `${recap.duels.won}·${recap.duels.lost}·${recap.duels.draw}`,
          label: "Duelos G·P·E"
        }
      ];
      const margin = 80;
      const gap = 30;
      const tw = (W - margin * 2 - gap) / 2;
      const th = 220;
      const top = 370;
      tiles.forEach((tile, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = margin + col * (tw + gap);
        const y = top + row * (th + gap);
        ctx.fillStyle = "#ffffff";
        rr(ctx, x, y, tw, th, 32);
        ctx.fill();
        ctx.fillStyle = "#e11d48";
        ctx.font = "700 92px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tile.big, x + tw / 2, y + 120);
        ctx.fillStyle = "#9f1239";
        ctx.font = "500 34px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(tile.label, x + tw / 2, y + 172);
      });

      // foto más comentada
      const stripY = top + th * 2 + gap + 40; // ~910
      if (recap.topMoment) {
        ctx.fillStyle = "#ffffff";
        rr(ctx, margin, stripY, W - margin * 2, 240, 32);
        ctx.fill();
        if (photo) {
          ctx.save();
          rr(ctx, margin + 24, stripY + 24, 192, 192, 20);
          ctx.clip();
          // cover
          const scale = Math.max(192 / photo.width, 192 / photo.height);
          const dw = photo.width * scale;
          const dh = photo.height * scale;
          ctx.drawImage(
            photo,
            margin + 24 + (192 - dw) / 2,
            stripY + 24 + (192 - dh) / 2,
            dw,
            dh
          );
          ctx.restore();
        }
        const textX = margin + 24 + (photo ? 216 : 0);
        ctx.textAlign = "left";
        ctx.fillStyle = "#9f1239";
        ctx.font = "600 30px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText("Foto más comentada", textX, stripY + 80);
        ctx.fillStyle = "#881337";
        ctx.font = "500 34px Georgia, serif";
        const title = recap.topMoment.title ?? "Un momento vuestro";
        ctx.fillText(title.length > 26 ? title.slice(0, 25) + "…" : title, textX, stripY + 130);
        ctx.fillStyle = "#e11d48";
        ctx.font = "600 30px -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(`${recap.topMoment.comments} comentarios`, textX, stripY + 180);
      }

      // footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#e11d48";
      ctx.font = "600 44px Georgia, serif";
      ctx.fillText("♥ Near", W / 2, H - 70);
    };

    draw();
    if (recap.topMoment?.imageUrl) {
      const img = new Image();
      img.onload = () => draw(img);
      img.src = recap.topMoment.imageUrl;
    }
  }, [recap, me, partner]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function download() {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `near-${recap.monthKey}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) return;
      const file = new File([blob], `near-${recap.monthKey}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Vuestro mes en Near" });
      } else {
        await download();
      }
    } catch {
      // el usuario canceló el diálogo de compartir: sin ruido
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-sm rounded-3xl shadow-card"
      />
      <div className="flex gap-3">
        <button
          onClick={download}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl border border-sand-deep bg-paper px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Descargar
        </button>
        {canShare && (
          <button
            onClick={share}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-rose px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> Compartir
          </button>
        )}
      </div>
    </div>
  );
}
