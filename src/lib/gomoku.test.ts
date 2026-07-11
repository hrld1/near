import { describe, expect, it } from "vitest";
import { GOMOKU_N, gomokuIndex, winningCells } from "./gomoku";

function empty(): (string | null)[] {
  return Array<string | null>(GOMOKU_N * GOMOKU_N).fill(null);
}

describe("winningCells", () => {
  it("detecta 5 en horizontal", () => {
    const cells = empty();
    for (let c = 3; c < 8; c++) cells[gomokuIndex(5, c)] = "x";
    const run = winningCells(cells, gomokuIndex(5, 5), "x");
    expect(run).not.toBeNull();
    expect(run!.length).toBeGreaterThanOrEqual(5);
  });

  it("no detecta con solo 4 seguidas", () => {
    const cells = empty();
    for (let c = 2; c < 6; c++) cells[gomokuIndex(0, c)] = "x";
    expect(winningCells(cells, gomokuIndex(0, 3), "x")).toBeNull();
  });

  it("detecta 5 en diagonal", () => {
    const cells = empty();
    for (let k = 0; k < 5; k++) cells[gomokuIndex(2 + k, 2 + k)] = "o";
    expect(winningCells(cells, gomokuIndex(4, 4), "o")).not.toBeNull();
  });

  it("no cruza el borde del tablero", () => {
    const cells = empty();
    // fila 0, columnas 10 y 11, y fila 1 columnas 0..2: no es línea real
    cells[gomokuIndex(0, 10)] = "x";
    cells[gomokuIndex(0, 11)] = "x";
    cells[gomokuIndex(1, 0)] = "x";
    cells[gomokuIndex(1, 1)] = "x";
    cells[gomokuIndex(1, 2)] = "x";
    expect(winningCells(cells, gomokuIndex(0, 11), "x")).toBeNull();
  });

  it("una celda vacía nunca gana", () => {
    expect(winningCells(empty(), gomokuIndex(6, 6), "x")).toBeNull();
  });
});
