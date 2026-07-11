// Lógica pura de Reversi (Othello), independiente de React y testeable.
// Tablero 8×8. Colocar una ficha que encierre una o más rivales en línea recta
// (con una tuya al otro extremo) las voltea a tu color. Genérico en el tipo de
// ficha para no acoplar a "me"/"them".

export const REVERSI_N = 8;

export function rIdx(r: number, c: number, n = REVERSI_N): number {
  return r * n + c;
}

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

// Posición inicial estándar: `first` (quien mueve) en las diagonales negras.
export function reversiInitial<T>(first: T, second: T, n = REVERSI_N): (T | null)[] {
  const cells = Array<T | null>(n * n).fill(null);
  const m = n / 2;
  cells[rIdx(m - 1, m, n)] = first;
  cells[rIdx(m, m - 1, n)] = first;
  cells[rIdx(m - 1, m - 1, n)] = second;
  cells[rIdx(m, m, n)] = second;
  return cells;
}

// Fichas que se voltearían si `side` juega en `at`. Vacío = jugada ilegal.
export function reversiFlips<T>(
  cells: (T | null)[],
  at: number,
  side: T,
  opp: T,
  n = REVERSI_N
): number[] {
  if (cells[at] !== null) return [];
  const r0 = Math.floor(at / n);
  const c0 = at % n;
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < n && c >= 0 && c < n && cells[rIdx(r, c, n)] === opp) {
      line.push(rIdx(r, c, n));
      r += dr;
      c += dc;
    }
    if (line.length > 0 && r >= 0 && r < n && c >= 0 && c < n && cells[rIdx(r, c, n)] === side) {
      flips.push(...line);
    }
  }
  return flips;
}

export function reversiLegalMoves<T>(cells: (T | null)[], side: T, opp: T, n = REVERSI_N): number[] {
  const moves: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (cells[i] === null && reversiFlips(cells, i, side, opp, n).length > 0) moves.push(i);
  }
  return moves;
}

export function reversiCounts<T>(cells: (T | null)[], a: T, b: T): { a: number; b: number } {
  let ca = 0;
  let cb = 0;
  for (const c of cells) {
    if (c === a) ca++;
    else if (c === b) cb++;
  }
  return { a: ca, b: cb };
}
