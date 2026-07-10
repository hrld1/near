// Lógica pura de "Hundir la flota" (independiente de React, testeable).
// Tablero 8x8; flota de 4 barcos (11 celdas). Colocación aleatoria sin solapes.

export const GRID = 8;
export const SHIP_SIZES = [4, 3, 2, 2];

export function cellKey(r: number, c: number): string {
  return `${r}:${c}`;
}

export function totalShipCells(): number {
  return SHIP_SIZES.reduce((a, b) => a + b, 0);
}

// Coloca la flota al azar sin solapes. Devuelve cada barco como lista de
// celdas "r:c". Determinista si se pasa un rng.
export function placeFleet(rng: () => number = Math.random): string[][] {
  const occupied = new Set<string>();
  const fleet: string[][] = [];
  for (const size of SHIP_SIZES) {
    let placed = false;
    for (let guard = 0; !placed && guard < 1000; guard++) {
      const horiz = rng() < 0.5;
      const r = Math.floor(rng() * (horiz ? GRID : GRID - size + 1));
      const c = Math.floor(rng() * (horiz ? GRID - size + 1 : GRID));
      const cells: string[] = [];
      for (let i = 0; i < size; i++) cells.push(cellKey(horiz ? r : r + i, horiz ? c + i : c));
      if (cells.some((k) => occupied.has(k))) continue;
      cells.forEach((k) => occupied.add(k));
      fleet.push(cells);
      placed = true;
    }
  }
  return fleet;
}
