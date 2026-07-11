// Lógica pura de "Puntos y cajas" (dots and boxes), independiente de React.
// Rejilla de R×C cajas. Las aristas se identifican por (orientación, r, c):
// orientación 0 = horizontal, 1 = vertical.
//  - H(r,c): arista superior de la caja (r,c) e inferior de (r-1,c). r∈0..R, c∈0..C-1
//  - V(r,c): arista izquierda de la caja (r,c) y derecha de (r,c-1). r∈0..R-1, c∈0..C

export const DOTS_R = 5;
export const DOTS_C = 5;

export function dotsEdgeKey(o: number, r: number, c: number): string {
  return `${o}:${r}:${c}`;
}

export function dotsBoxKey(r: number, c: number): string {
  return `${r}:${c}`;
}

// Las 4 aristas de la caja (r,c): arriba, abajo, izquierda, derecha.
export function dotsBoxEdges(r: number, c: number): string[] {
  return [dotsEdgeKey(0, r, c), dotsEdgeKey(0, r + 1, c), dotsEdgeKey(1, r, c), dotsEdgeKey(1, r, c + 1)];
}

// Cajas adyacentes a una arista (0, 1 o 2), dentro de la rejilla.
export function dotsAdjBoxes(o: number, r: number, c: number, R = DOTS_R, C = DOTS_C): [number, number][] {
  const boxes: [number, number][] = [];
  if (o === 0) {
    if (r < R) boxes.push([r, c]);
    if (r > 0) boxes.push([r - 1, c]);
  } else {
    if (c < C) boxes.push([r, c]);
    if (c > 0) boxes.push([r, c - 1]);
  }
  return boxes;
}

// Cajas que quedan completamente cerradas al añadir la arista (o,r,c),
// asumiendo que `claimed` YA la contiene. Devuelve sus claves "r:c".
export function dotsClosedBoxes(
  claimed: Set<string>,
  o: number,
  r: number,
  c: number,
  R = DOTS_R,
  C = DOTS_C
): string[] {
  const closed: string[] = [];
  for (const [br, bc] of dotsAdjBoxes(o, r, c, R, C)) {
    if (dotsBoxEdges(br, bc).every((k) => claimed.has(k))) closed.push(dotsBoxKey(br, bc));
  }
  return closed;
}

export function dotsTotalBoxes(R = DOTS_R, C = DOTS_C): number {
  return R * C;
}
