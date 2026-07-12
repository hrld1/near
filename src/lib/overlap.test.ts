import { describe, expect, it } from "vitest";
import { futureIntervals, overlapIntervals } from "./overlap";

const H = 60 * 60 * 1000; // una hora en ms

describe("overlapIntervals", () => {
  it("intersección parcial", () => {
    expect(overlapIntervals([{ start: 0, end: 100 * H }], [{ start: 50 * H, end: 150 * H }], 0)).toEqual([
      { start: 50 * H, end: 100 * H }
    ]);
  });

  it("sin solape devuelve vacío", () => {
    expect(overlapIntervals([{ start: 0, end: 10 * H }], [{ start: 20 * H, end: 30 * H }], 0)).toEqual([]);
  });

  it("varias franjas: mantiene las separadas", () => {
    const a = [
      { start: 0, end: 50 * H },
      { start: 60 * H, end: 100 * H }
    ];
    const b = [{ start: 40 * H, end: 70 * H }];
    expect(overlapIntervals(a, b, 0)).toEqual([
      { start: 40 * H, end: 50 * H },
      { start: 60 * H, end: 70 * H }
    ]);
  });

  it("fusiona coincidencias que se tocan", () => {
    const a = [
      { start: 0, end: 50 * H },
      { start: 50 * H, end: 100 * H }
    ];
    const b = [{ start: 0, end: 100 * H }];
    expect(overlapIntervals(a, b, 0)).toEqual([{ start: 0, end: 100 * H }]);
  });

  it("descarta solapes menores que el mínimo (15 min por defecto)", () => {
    // solo 10 minutos en común
    const ten = 10 * 60 * 1000;
    expect(overlapIntervals([{ start: 0, end: ten }], [{ start: 0, end: ten }])).toEqual([]);
    // 20 minutos sí
    const twenty = 20 * 60 * 1000;
    expect(overlapIntervals([{ start: 0, end: twenty }], [{ start: 0, end: twenty }]).length).toBe(1);
  });
});

describe("futureIntervals", () => {
  it("recorta el pasado y descarta lo vencido", () => {
    const now = 30 * H;
    const list = [
      { start: 0, end: 10 * H }, // ya pasó
      { start: 20 * H, end: 40 * H } // en curso: se recorta a now
    ];
    expect(futureIntervals(list, now, 0)).toEqual([{ start: 30 * H, end: 40 * H }]);
  });
});
