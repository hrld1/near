"use client";

import { useEffect } from "react";
import { saveTimezoneAction } from "@/actions/presence";

// Guarda automáticamente la zona horaria real del navegador en el perfil.
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone && timezone !== current) {
        void saveTimezoneAction(timezone);
      }
    } catch {
      // sin soporte Intl: se mantiene la zona por defecto
    }
  }, [current]);
  return null;
}
