"use client";

import { useEffect } from "react";

// Registra el service worker (push + notificationclick). Como el SW no
// cachea fetch, registrarlo también en dev no ensucia nada y permite
// probar las notificaciones en local.
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
