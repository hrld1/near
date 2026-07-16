import { describe, expect, it } from "vitest";
import { coupleAgeDays, daysBetweenKeys, discoveryOfDay, FIRST_STEPS } from "./first-days";

describe("daysBetweenKeys", () => {
  it("mismo día = 0, día siguiente = 1", () => {
    expect(daysBetweenKeys("2026-07-16", "2026-07-16")).toBe(0);
    expect(daysBetweenKeys("2026-07-16", "2026-07-17")).toBe(1);
  });

  it("cruza mes y año", () => {
    expect(daysBetweenKeys("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetweenKeys("2025-12-30", "2026-01-02")).toBe(3);
  });

  it("negativo si b es anterior", () => {
    expect(daysBetweenKeys("2026-07-16", "2026-07-14")).toBe(-2);
  });
});

describe("coupleAgeDays", () => {
  it("el día de vincularos es el día 1", () => {
    const created = new Date("2026-07-16T10:00:00Z");
    expect(coupleAgeDays(created, "Europe/Madrid", new Date("2026-07-16T18:00:00Z"))).toBe(1);
  });

  it("cuenta por claves de día, no por horas: vincularse a las 23:50 no roba el primer día", () => {
    // 23:50 en Madrid; 5 horas después son las 04:50 del día siguiente → día 2
    const created = new Date("2026-07-16T21:50:00Z"); // 23:50 Madrid (verano)
    expect(coupleAgeDays(created, "Europe/Madrid", new Date("2026-07-17T02:50:00Z"))).toBe(2);
    // aunque hayan pasado solo 5 horas
  });

  it("usa la zona de la pareja: el mismo instante puede ser día 1 o 2 según el huso", () => {
    const created = new Date("2026-07-16T23:30:00Z"); // 01:30 del 17 en Madrid, 20:30 del 16 en Buenos Aires
    const now = new Date("2026-07-17T04:00:00Z"); // 06:00 del 17 en Madrid, 01:00 del 17 en Buenos Aires
    expect(coupleAgeDays(created, "Europe/Madrid", now)).toBe(1); // ambos instantes caen en el 17
    expect(coupleAgeDays(created, "America/Argentina/Buenos_Aires", now)).toBe(2); // 16 → 17
  });

  it("día 8 queda fuera de la primera semana", () => {
    const created = new Date("2026-07-01T10:00:00Z");
    expect(coupleAgeDays(created, "Europe/Madrid", new Date("2026-07-08T10:00:00Z"))).toBe(8);
  });
});

describe("discoveryOfDay", () => {
  it("el día 1 no sugiere nada (ese día manda la lista)", () => {
    expect(discoveryOfDay(1)).toBeNull();
  });

  it("los días 2 a 7 sugieren exactamente una cosa, en orden", () => {
    const keys = [2, 3, 4, 5, 6, 7].map((d) => discoveryOfDay(d)?.key);
    expect(keys).toEqual(["carta", "reto", "coincidir", "mazo", "juntos", "libro"]);
  });

  it("fuera de la primera semana, nada", () => {
    expect(discoveryOfDay(0)).toBeNull();
    expect(discoveryOfDay(8)).toBeNull();
    expect(discoveryOfDay(30)).toBeNull();
  });

  it("cada descubrimiento lleva destino y llamada a la acción", () => {
    for (const d of [2, 3, 4, 5, 6, 7].map((n) => discoveryOfDay(n)!)) {
      expect(d.href.startsWith("/")).toBe(true);
      expect(d.cta.length).toBeGreaterThan(3);
    }
  });
});

describe("FIRST_STEPS", () => {
  it("son 4 pasos con claves únicas", () => {
    expect(FIRST_STEPS).toHaveLength(4);
    expect(new Set(FIRST_STEPS.map((s) => s.key)).size).toBe(4);
  });
});
