import { describe, expect, it } from "vitest";
import { GRID, SHIP_SIZES, cellKey, placeFleet, totalShipCells } from "./battleship";

describe("placeFleet", () => {
  it("coloca todos los barcos, sin solapes y dentro del tablero", () => {
    for (let n = 0; n < 200; n++) {
      const fleet = placeFleet();
      expect(fleet.length).toBe(SHIP_SIZES.length);
      const all = fleet.flat();
      expect(all.length).toBe(totalShipCells());
      expect(new Set(all).size).toBe(all.length); // sin solapes
      for (const k of all) {
        const [r, c] = k.split(":").map(Number);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(GRID);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(GRID);
      }
    }
  });

  it("los barcos son rectos y contiguos", () => {
    const fleet = placeFleet();
    for (const ship of fleet) {
      const rs = ship.map((k) => Number(k.split(":")[0]));
      const cs = ship.map((k) => Number(k.split(":")[1]));
      const sameRow = new Set(rs).size === 1;
      const sameCol = new Set(cs).size === 1;
      expect(sameRow || sameCol).toBe(true);
      const line = sameRow ? cs : rs;
      line.sort((a, b) => a - b);
      for (let i = 1; i < line.length; i++) expect(line[i] - line[i - 1]).toBe(1);
    }
  });

  it("cellKey es consistente", () => {
    expect(cellKey(2, 5)).toBe("2:5");
  });
});
