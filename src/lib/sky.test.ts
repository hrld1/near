import { describe, expect, it } from "vitest";
import { skyForHour } from "./sky";

describe("skyForHour", () => {
  it("de madrugada es noche con estrellas y luna", () => {
    const s = skyForHour(2);
    expect(s.phase).toBe("night");
    expect(s.stars).toBe(true);
    expect(s.body).toBe("moon");
  });

  it("a mediodía es día, sol alto y sin estrellas", () => {
    const s = skyForHour(13);
    expect(s.phase).toBe("day");
    expect(s.body).toBe("sun");
    expect(s.stars).toBe(false);
    expect(s.bodyY).toBeGreaterThan(0.9); // cerca del cénit
  });

  it("distingue amanecer y atardecer", () => {
    expect(skyForHour(6.5).phase).toBe("dawn");
    expect(skyForHour(19.5).phase).toBe("dusk");
  });

  it("el astro sale bajo y sube: al alba el sol está más bajo que a mediodía", () => {
    expect(skyForHour(7.5).bodyY).toBeLessThan(skyForHour(13).bodyY);
  });

  it("posiciones siempre normalizadas 0..1", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const s = skyForHour(h);
      expect(s.bodyX).toBeGreaterThanOrEqual(0);
      expect(s.bodyX).toBeLessThanOrEqual(1);
      expect(s.bodyY).toBeGreaterThanOrEqual(0);
      expect(s.bodyY).toBeLessThanOrEqual(1);
      expect(s.gradient).toHaveLength(3);
    }
  });

  it("es robusto a horas fuera de rango (envuelve 0..24)", () => {
    expect(skyForHour(26).phase).toBe(skyForHour(2).phase);
    expect(skyForHour(-2).phase).toBe(skyForHour(22).phase);
  });
});
