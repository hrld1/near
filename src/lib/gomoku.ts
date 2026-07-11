// Lógica pura de "5 en raya" (Gomoku), independiente de React y testeable.
// Tablero N×N; gana quien alinea WIN fichas seguidas en cualquier dirección.

export const GOMOKU_N = 12;
export const GOMOKU_WIN = 5;

export function gomokuIndex(r: number, c: number, n = GOMOKU_N): number {
  return r * n + c;
}

// Devuelve las celdas de la racha ganadora que pasa por `at` para `owner`
// (>= win fichas seguidas), o null si no hay línea. Genérico en el tipo de
// ficha para poder testear sin acoplar a "me"/"them".
export function winningCells<T>(
  cells: (T | null)[],
  at: number,
  owner: T,
  n = GOMOKU_N,
  win = GOMOKU_WIN
): number[] | null {
  if (cells[at] !== owner) return null;
  const r0 = Math.floor(at / n);
  const c0 = at % n;
  const dirs = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal \
    [1, -1] // diagonal /
  ];
  for (const [dr, dc] of dirs) {
    const run = [at];
    // hacia adelante
    for (let k = 1; ; k++) {
      const r = r0 + dr * k;
      const c = c0 + dc * k;
      if (r < 0 || r >= n || c < 0 || c >= n || cells[gomokuIndex(r, c, n)] !== owner) break;
      run.push(gomokuIndex(r, c, n));
    }
    // hacia atrás
    for (let k = 1; ; k++) {
      const r = r0 - dr * k;
      const c = c0 - dc * k;
      if (r < 0 || r >= n || c < 0 || c >= n || cells[gomokuIndex(r, c, n)] !== owner) break;
      run.unshift(gomokuIndex(r, c, n));
    }
    if (run.length >= win) return run;
  }
  return null;
}
