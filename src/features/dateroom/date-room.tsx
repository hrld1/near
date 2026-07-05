"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Clapperboard, MonitorPlay, Popcorn } from "lucide-react";
import { setVideoAction, updatePlaybackAction } from "@/actions/dateroom";
import { setRoomModeAction } from "@/actions/dateroom";
import { CallStage } from "@/features/dateroom/call-stage";
import { CompanionRoom } from "@/features/dateroom/companion";
import { cn } from "@/lib/utils";
import { ChatRoom } from "@/features/chat/chat-room";
import { useCoupleStream } from "@/hooks/use-stream";
import { Input, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChatMessage, DateRoomDto, MemberInfo } from "@/types";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}

type RemoteState = DateRoomDto & { byId: string };

export function DateRoom({
  me,
  partner,
  initialState,
  initialMessages,
  initialMode,
  initialPlatform,
  initialTitle
}: {
  me: MemberInfo;
  partner: MemberInfo | null;
  initialState: DateRoomDto;
  initialMessages: ChatMessage[];
  initialMode: "YOUTUBE" | "COMPANION";
  initialPlatform: string | null;
  initialTitle: string | null;
}) {
  const [mode, setMode] = useState<"YOUTUBE" | "COMPANION">(initialMode);
  const [videoId, setVideoId] = useState(initialState.videoId);
  const [videoTitle, setVideoTitle] = useState(initialState.videoTitle);
  const [url, setUrl] = useState("");
  const [syncFlash, setSyncFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const applyingRemoteRef = useRef(false);
  const lastSentRef = useRef(0);

  // Crea / recrea el player cuando cambia el video o el modo
  useEffect(() => {
    if (mode !== "YOUTUBE") {
      playerRef.current?.destroy?.();
      playerRef.current = null;
      return;
    }
    if (!videoId) return;
    let cancelled = false;
    void loadYouTubeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId, initialState.positionSec);
        if (!initialState.playing) playerRef.current.pauseVideo();
        return;
      }
      playerRef.current = new YT.Player(playerContainerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (event: any) => {
            if (initialState.positionSec > 1) {
              event.target.seekTo(initialState.positionSec, true);
            }
            if (initialState.playing) event.target.playVideo();
          },
          onStateChange: (event: any) => {
            if (applyingRemoteRef.current) return;
            const YTNS = window.YT;
            if (!YTNS) return;
            const position = event.target.getCurrentTime?.() ?? 0;
            const now = Date.now();
            if (event.data === YTNS.PlayerState.PLAYING) {
              lastSentRef.current = now;
              void updatePlaybackAction({ playing: true, positionSec: position });
            } else if (event.data === YTNS.PlayerState.PAUSED) {
              // evita rafagas de eventos al hacer seek
              if (now - lastSentRef.current < 250) return;
              lastSentRef.current = now;
              void updatePlaybackAction({ playing: false, positionSec: position });
            }
          }
        }
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, mode]);

  useCoupleStream((event) => {
    if (event.type === "room:mode") {
      setMode(event.payload.mode);
    }
    if (event.type !== "dateroom:update") return;
    const state = event.payload;
    if (state.byId === me.id) return;

    setSyncFlash(state.playing ? "play" : "pausa");
    setTimeout(() => setSyncFlash(null), 2500);

    setVideoTitle(state.videoTitle);
    if (state.videoId !== videoId) {
      setVideoId(state.videoId);
      return;
    }
    const player = playerRef.current;
    if (!player?.getCurrentTime) return;

    applyingRemoteRef.current = true;
    try {
      const drift = Math.abs(player.getCurrentTime() - state.positionSec);
      if (drift > 1.5) player.seekTo(state.positionSec, true);
      if (state.playing) player.playVideo();
      else player.pauseVideo();
    } finally {
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 800);
    }
  });

  function submitVideo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setVideoAction(url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl("");
      if (result.data) {
        setVideoId(result.data.videoId);
        setVideoTitle(result.data.videoTitle);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-[1.6] flex-col gap-3">
        <CallStage />

        <div className="flex gap-1 rounded-full bg-sand p-1">
          <button
            onClick={() => {
              setMode("YOUTUBE");
              void setRoomModeAction({ mode: "YOUTUBE" });
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition",
              mode === "YOUTUBE" ? "bg-paper text-ink shadow-card" : "text-ink-soft hover:text-ink"
            )}
          >
            <MonitorPlay className="h-4 w-4" /> Ver juntos (YouTube)
          </button>
          <button
            onClick={() => setMode("COMPANION")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition",
              mode === "COMPANION" ? "bg-paper text-ink shadow-card" : "text-ink-soft hover:text-ink"
            )}
          >
            <Popcorn className="h-4 w-4" /> Netflix y compania
          </button>
        </div>

        {mode === "COMPANION" ? (
          <CompanionRoom
            myId={me.id}
            partnerName={partner?.name ?? "tu pareja"}
            initialPlatform={initialPlatform}
            initialTitle={initialTitle}
          />
        ) : (
          <>
        <form onSubmit={submitVideo} className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega un enlace de YouTube para verlo juntos..."
            className="flex-1"
          />
          <Button type="submit" loading={pending} disabled={!url.trim()}>
            Ver juntos
          </Button>
        </form>
        <FieldError>{error ?? undefined}</FieldError>

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-sand bg-black shadow-card">
          {syncFlash && (
            <span className="absolute left-3 top-3 z-10 flex animate-fade-up items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {partner?.name ?? "Tu pareja"} sincronizo ({syncFlash})
            </span>
          )}
          {videoId && videoTitle && (
            <span className="absolute bottom-3 left-3 z-10 max-w-[80%] truncate rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              ▶ {videoTitle}
            </span>
          )}
          {videoId ? (
            <div ref={playerContainerRef} className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
              <Clapperboard className="h-8 w-8" />
              <p className="max-w-xs text-center text-sm">
                Pega un enlace de YouTube arriba. La reproduccion se sincroniza
                para los dos: play, pausa y saltos.
              </p>
            </div>
          )}
        </div>

          </>
        )}
      </div>

      <div className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sand bg-paper shadow-card">
        <div className="border-b border-sand px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Chat de la sala {partner ? `· con ${partner.name}` : ""}
          </p>
        </div>
        <ChatRoom
          me={me}
          partner={partner}
          initialMessages={initialMessages}
          channel="DATE_ROOM"
          compact
        />
      </div>
    </div>
  );
}
