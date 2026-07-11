import { describe, expect, it } from "vitest";
import { dotsBoxEdges, dotsClosedBoxes, dotsEdgeKey } from "./dots";

describe("dots and boxes", () => {
  it("las 4 aristas de una caja son las esperadas", () => {
    expect(dotsBoxEdges(1, 1)).toEqual([
      dotsEdgeKey(0, 1, 1), // arriba
      dotsEdgeKey(0, 2, 1), // abajo
      dotsEdgeKey(1, 1, 1), // izquierda
      dotsEdgeKey(1, 1, 2) // derecha
    ]);
  });

  it("con 3 aristas no cierra; la 4ª cierra la caja", () => {
    const edges = dotsBoxEdges(2, 2);
    const claimed = new Set(edges.slice(0, 3));
    // añade la última arista (vertical derecha, V(2,3))
    expect(dotsClosedBoxes(claimed, 1, 2, 2)).toEqual([]); // aún faltaba la derecha
    claimed.add(dotsEdgeKey(1, 2, 3));
    expect(dotsClosedBoxes(claimed, 1, 2, 3)).toEqual(["2:2"]);
  });

  it("una arista compartida puede cerrar dos cajas a la vez", () => {
    // cajas (0,0) y (1,0) comparten la arista H(1,0). Cerramos todas menos esa.
    const claimed = new Set<string>();
    for (const e of dotsBoxEdges(0, 0)) claimed.add(e);
    for (const e of dotsBoxEdges(1, 0)) claimed.add(e);
    // quita la compartida (H(1,0)) para simular que es la última en colocarse
    claimed.delete(dotsEdgeKey(0, 1, 0));
    expect(dotsClosedBoxes(claimed, 0, 1, 0).sort()).toEqual([]);
    claimed.add(dotsEdgeKey(0, 1, 0));
    expect(dotsClosedBoxes(claimed, 0, 1, 0).sort()).toEqual(["0:0", "1:0"]);
  });
});
