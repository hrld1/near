import { describe, expect, it } from "vitest";
import { GRID, SHIP_SIZES, cellKey, placeFleet, shipCells, totalShipCells, tryPlace } from "./battleship";

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

describe("colocación manual (it53)", () => {
  it("shipCells genera celdas rectas y contiguas según orientación", () => {
    expect(shipCells(0, 0, 3, true)).toEqual(["0:0", "0:1", "0:2"]);
    expect(shipCells(0, 0, 3, false)).toEqual(["0:0", "1:0", "2:0"]);
  });

  it("tryPlace acepta un barco que cabe y no solapa", () => {
    const cells = tryPlace(new Set(), 2, 2, 4, true);
    expect(cells).toEqual(["2:2", "2:3", "2:4", "2:5"]);
  });

  it("tryPlace rechaza si se sale del tablero", () => {
    expect(tryPlace(new Set(), 0, GRID - 1, 3, true)).toBeNull();
    expect(tryPlace(new Set(), GRID - 1, 0, 3, false)).toBeNull();
  });

  it("tryPlace rechaza si solapa con lo ocupado", () => {
    const occupied = new Set(["1:1"]);
    expect(tryPlace(occupied, 1, 0, 3, true)).toBeNull();
  });
});
