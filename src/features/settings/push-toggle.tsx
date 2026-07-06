"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { subscribePushAction, unsubscribePushAction } from "@/actions/push";
import { Button } from "@/components/ui/button";

type Status = "loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Alta/baja de notificaciones push de ESTE dispositivo. El permiso se pide
// solo al pulsar el botón (nunca al cargar).
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    void (async () => {
      if (!vapidKey) return setStatus("unconfigured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setStatus("unsupported");
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "on" : "off");
    })();
  }, [vapidKey]);

  async function enable() {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!)
      });
      const json = subscription.toJSON();
      const result = await subscribePushAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent.slice(0, 300)
      });
      if (!result.ok) throw new Error(result.error);
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-ink-soft">Comprobando este dispositivo...</p>;
  }
  if (status === "unconfigured") {
    return (
      <p className="text-sm text-ink-soft">
        El servidor no tiene claves VAPID configuradas (ver README). La app funciona
        igual; solo falta el push.
      </p>
    );
  }
  if (status === "unsupported") {
    return (
      <p className="text-sm text-ink-soft">
        Este navegador no soporta notificaciones push. En iPhone/iPad hace falta
        iOS 16.4+ y añadir Near a la pantalla de inicio.
      </p>
    );
  }
  if (status === "denied") {
    return (
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
        Las notificaciones están bloqueadas para este sitio. Permitelas en los
        ajustes del navegador y recarga.
      </p>
    );
  }

  return (
    <div>
      {status === "on" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <BellRing className="h-4 w-4 text-rose" />
            Activadas en este dispositivo
          </p>
          <Button size="sm" variant="secondary" loading={busy} onClick={disable}>
            Desactivar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Bell className="h-4 w-4" />
            Mensajes, latidos y la caja del día, aunque no estes mirando.
          </p>
          <Button size="sm" loading={busy} onClick={enable}>
            Activar
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
