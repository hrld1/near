// Lógica pura de "Hundir la flota" (independiente de React, testeable).
// Tablero 8x8; flota de 4 barcos (11 celdas). Colocación aleatoria sin solapes.

export const GRID = 8;
export const SHIP_SIZES = [4, 3, 2, 2];

export function cellKey(r: number, c: number): string {
  return `${r}:${c}`;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < GRID && c >= 0 && c < GRID;
}

// Celdas que ocuparía un barco anclado en (r,c) con un tamaño y orientación.
export function shipCells(r: number, c: number, size: number, horiz: boolean): string[] {
  const cells: string[] = [];
  for (let i = 0; i < size; i++) cells.push(cellKey(horiz ? r : r + i, horiz ? c + i : c));
  return cells;
}

// Colocación manual (it53): devuelve las celdas si el barco cabe dentro del
// tablero y no solapa con lo ya ocupado, o null si no vale.
export function tryPlace(
  occupied: Set<string>,
  r: number,
  c: number,
  size: number,
  horiz: boolean
): string[] | null {
  const cells = shipCells(r, c, size, horiz);
  for (const cell of cells) {
    const [cr, cc] = cell.split(":").map(Number);
    if (!inBounds(cr, cc)) return null;
    if (occupied.has(cell)) return null;
  }
  return cells;
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
