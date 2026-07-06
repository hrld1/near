"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Radio, Link2, Loader2 } from "lucide-react";
import {
  broadcastPlaybackAction,
  followPlaybackAction,
  disconnectSpotifyAction
} from "@/actions/spotify";
import { useCoupleStream } from "@/hooks/use-stream";
import { cn } from "@/lib/utils";
import type { StreamEvent } from "@/types";

type Now = Extract<StreamEvent, { type: "music:sync" }>["payload"];

// "Música juntos" con Spotify Connect real. Solo aparece si el entorno tiene
// claves de Spotify; si no, la sala usa el modo companion honesto de siempre.
// El líder comparte lo que suena; el seguidor lo ve y, si conecta su cuenta
// (Premium con dispositivo activo), lo hace sonar en su lado.
export function MusicTogether({
  myId,
  partnerName,
  connected,
  partnerConnected
}: {
  myId: string;
  partnerName: string;
  connected: boolean;
  partnerConnected: boolean;
}) {
  const [leading, setLeading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [partnerNow, setPartnerNow] = useState<Now | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lastFollowRef = useRef({ uri: "", at: 0 });

  // Modo líder: cada 4 s el servidor lee mi reproducción y la difunde.
  useEffect(() => {
    if (!leading) return;
    let alive = true;
    const tick = async () => {
      const res = await broadcastPlaybackAction();
      if (!alive) return;
      if (!res.ok) {
        setNote(res.error);
        setLeading(false);
      }
    };
    void tick();
    const id = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [leading]);

  useCoupleStream((event) => {
    if (event.type !== "music:sync") return;
    if (event.payload.byId === myId) return;
    setPartnerNow(event.payload);
  });

  // Modo seguidor: alinear mi Spotify con lo que suena en el líder. No lo
  // hacemos en cada sync (cortaría la canción); solo al cambiar de tema o
  // cada ~12 s para recuperar la sincronía de posición.
  useEffect(() => {
    if (!following || !partnerNow?.trackUri) return;
    const now = Date.now();
    const changedTrack = partnerNow.trackUri !== lastFollowRef.current.uri;
    const stale = now - lastFollowRef.current.at > 12_000;
    if (!changedTrack && !stale) return;
    if (!partnerNow.playing && !changedTrack) return;
    lastFollowRef.current = { uri: partnerNow.trackUri, at: now };
    const elapsed = partnerNow.playing ? now - partnerNow.at : 0;
    const target = partnerNow.positionMs + elapsed;
    void followPlaybackAction({ trackUri: partnerNow.trackUri, positionMs: target }).then((res) => {
      if (!res.ok) {
        setNote(res.error);
        setFollowing(false);
      }
    });
  }, [following, partnerNow]);

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectSpotifyAction();
      setLeading(false);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sand bg-paper p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <Music className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Música juntos</p>
          <p className="text-xs text-ink-soft">Spotify Connect, de verdad — lo que suena, a la vez.</p>
        </div>
      </div>

      {!connected ? (
        <a
          href="/api/spotify/login"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <Link2 className="h-4 w-4" /> Conectar mi Spotify
        </a>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setNote(null);
              setLeading((v) => !v);
              if (!leading) setFollowing(false);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition",
              leading
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-sand text-ink hover:bg-sand"
            )}
          >
            <Radio className="h-4 w-4" />
            {leading ? "Compartiendo lo que suena" : "Compartir mi música"}
          </button>
          <button
            onClick={disconnect}
            disabled={busy}
            className="text-xs text-ink-soft underline-offset-2 hover:underline disabled:opacity-50"
          >
            Desconectar
          </button>
        </div>
      )}

      {/* lo que suena en el otro lado */}
      {partnerNow && (partnerNow.trackName || partnerNow.trackUri) && (
        <div className="flex items-center gap-3 rounded-xl bg-sand/60 p-3">
          {partnerNow.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerNow.albumArt}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-card"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink/10 text-ink-soft">
              <Music className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              {partnerNow.playing ? `Suena para ${partnerName}` : `${partnerName} tiene en pausa`}
            </p>
            <p className="truncate text-sm font-medium text-ink">{partnerNow.trackName ?? "—"}</p>
            {partnerNow.artists && (
              <p className="truncate text-xs text-ink-soft">{partnerNow.artists}</p>
            )}
          </div>
          {connected && (
            <button
              onClick={() => {
                setNote(null);
                setFollowing((v) => !v);
                if (!following) {
                  setLeading(false);
                  lastFollowRef.current = { uri: "", at: 0 };
                }
              }}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                following ? "bg-emerald-600 text-white" : "border border-sand text-ink hover:bg-sand"
              )}
            >
              {following ? "Sonando conmigo" : "Sonar en mi Spotify"}
            </button>
          )}
        </div>
      )}

      {note && <p className="text-xs text-amber-600">{note}</p>}

      {connected && !partnerConnected && (
        <p className="text-xs text-ink-soft">
          Cuando {partnerName} conecte su Spotify, podréis escuchar lo mismo a la vez.
        </p>
      )}
      {busy && (
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Desconectando…
        </p>
      )}
    </div>
  );
}
