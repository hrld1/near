import { describe, expect, it } from "vitest";
import { reversiCounts, reversiFlips, reversiInitial, reversiLegalMoves, rIdx } from "./reversi";

describe("reversi", () => {
  it("la posición inicial tiene 2 fichas de cada color", () => {
    const cells = reversiInitial("B", "W");
    expect(reversiCounts(cells, "B", "W")).toEqual({ a: 2, b: 2 });
  });

  it("el que abre tiene exactamente 4 jugadas legales", () => {
    const cells = reversiInitial("B", "W");
    expect(reversiLegalMoves(cells, "B", "W").length).toBe(4);
  });

  it("una jugada de apertura voltea exactamente una ficha", () => {
    const cells = reversiInitial("B", "W");
    // (2,3) encierra la W de (3,3) contra la B de (4,3)
    const flips = reversiFlips(cells, rIdx(2, 3), "B", "W");
    expect(flips).toEqual([rIdx(3, 3)]);
  });

  it("jugar sobre una casilla ocupada es ilegal", () => {
    const cells = reversiInitial("B", "W");
    expect(reversiFlips(cells, rIdx(3, 3), "B", "W")).toEqual([]);
  });

  it("una jugada sin encierro es ilegal", () => {
    const cells = reversiInitial("B", "W");
    expect(reversiFlips(cells, rIdx(0, 0), "B", "W")).toEqual([]);
  });
});
