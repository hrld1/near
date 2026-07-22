import { useEffect, useRef } from "react";

// Teclado para los juegos de "dirigir" (Meteoros, Esquí, A las nubes,
// Rompemuros): un ref con las teclas pulsadas AHORA MISMO, para que el propio
// bucle de animación del juego lo lea cada frame — igual que ya lee la
// posición del puntero. No dispara nada por sí solo: cada juego decide qué
// hacer con los ejes en su frame().
const STEER_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "a",
  "A",
  "d",
  "D",
  "w",
  "W",
  "s",
  "S"
]);

export function useSteerKeys() {
  const held = useRef<Set<string>>(new Set());
  useEffect(() => {
    const set = held.current;
    const down = (e: KeyboardEvent) => {
      if (!STEER_KEYS.has(e.key)) return;
      set.add(e.key);
      e.preventDefault(); // las flechas no deben desplazar la página
    };
    const up = (e: KeyboardEvent) => {
      set.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      set.clear();
    };
  }, []);
  return held;
}

// Eje -1..1 por dirección, admitiendo flechas o WASD indistintamente.
export function steerAxis(held: Set<string>): { x: number; y: number } {
  const left = held.has("ArrowLeft") || held.has("a") || held.has("A");
  const right = held.has("ArrowRight") || held.has("d") || held.has("D");
  const up = held.has("ArrowUp") || held.has("w") || held.has("W");
  const down = held.has("ArrowDown") || held.has("s") || held.has("S");
  return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
}
