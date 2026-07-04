"use client";

import { useEffect, useRef } from "react";
import type { StreamEvent } from "@/types";

export function useCoupleStream(onEvent: (event: StreamEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as StreamEvent;
        if (event.type === "ping" || event.type === "connected") return;
        handlerRef.current(event);
      } catch {
        // evento malformado: ignorar
      }
    };
    return () => source.close();
  }, []);
}
