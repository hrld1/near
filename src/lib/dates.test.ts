import { describe, expect, it } from "vitest";
import { dayKeyIn, dayRangeUtc, mondayOfWeek, monthKeyIn, shiftDayKey } from "./dates";

describe("dayKeyIn", () => {
  it("da dias distintos a la vez en zonas extremas", () => {
    // 2026-07-04T23:30Z: en Kiritimati (+14) ya es dia 5; en Niue (-11) aun es dia 4
    const instant = new Date("2026-07-04T23:30:00Z");
    expect(dayKeyIn("UTC", instant)).toBe("2026-07-04");
    expect(dayKeyIn("Pacific/Kiritimati", instant)).toBe("2026-07-05");
    expect(dayKeyIn("Pacific/Niue", instant)).toBe("2026-07-04");
  });

  it("respeta la frontera de medianoche local en Madrid (verano, UTC+2)", () => {
    expect(dayKeyIn("Europe/Madrid", new Date("2026-07-04T21:59:00Z"))).toBe("2026-07-04");
    expect(dayKeyIn("Europe/Madrid", new Date("2026-07-04T22:00:00Z"))).toBe("2026-07-05");
  });

  it("respeta la frontera en Madrid en invierno (UTC+1)", () => {
    expect(dayKeyIn("Europe/Madrid", new Date("2026-01-04T22:59:00Z"))).toBe("2026-01-04");
    expect(dayKeyIn("Europe/Madrid", new Date("2026-01-04T23:00:00Z"))).toBe("2026-01-05");
  });
});

describe("monthKeyIn", () => {
  it("cambia de mes segun la zona", () => {
    const instant = new Date("2026-06-30T23:30:00Z");
    expect(monthKeyIn("UTC", instant)).toBe("2026-06");
    expect(monthKeyIn("Europe/Madrid", instant)).toBe("2026-07");
  });
});

describe("shiftDayKey", () => {
  it("suma y resta dias", () => {
    expect(shiftDayKey("2026-07-04", 1)).toBe("2026-07-05");
    expect(shiftDayKey("2026-07-04", -4)).toBe("2026-06-30");
  });

  it("cruza cambios de mes y de anyo", () => {
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("maneja anyos bisiestos", () => {
    expect(shiftDayKey("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDayKey("2025-02-28", 1)).toBe("2025-03-01");
  });
});

describe("mondayOfWeek", () => {
  it("devuelve el lunes de la semana", () => {
    expect(mondayOfWeek("2026-07-04")).toBe("2026-06-29"); // sabado -> lunes anterior
    expect(mondayOfWeek("2026-07-05")).toBe("2026-06-29"); // domingo pertenece a la semana del lunes 29
    expect(mondayOfWeek("2026-06-29")).toBe("2026-06-29"); // un lunes se devuelve tal cual
    expect(mondayOfWeek("2026-07-06")).toBe("2026-07-06"); // lunes siguiente
  });
});

describe("dayRangeUtc", () => {
  it("devuelve el rango [00:00, 24:00) local en UTC", () => {
    const { start, end } = dayRangeUtc("2026-07-04", "Europe/Madrid");
    expect(start.toISOString()).toBe("2026-07-03T22:00:00.000Z"); // UTC+2 en verano
    expect(end.toISOString()).toBe("2026-07-04T22:00:00.000Z");
  });

  it("el dia del cambio a horario de verano dura 23 horas", () => {
    // En Madrid, el 2026-03-29 salta de 02:00 a 03:00
    const { start, end } = dayRangeUtc("2026-03-29", "Europe/Madrid");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it("el dia de la vuelta al horario de invierno dura 25 horas", () => {
    // En Madrid, el 2026-10-25 repite la hora de 02:00 a 03:00
    const { start, end } = dayRangeUtc("2026-10-25", "Europe/Madrid");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });

  it("un instante dentro del dia local cae dentro del rango", () => {
    const tz = "America/Mexico_City";
    const instant = new Date("2026-07-05T04:30:00Z"); // 22:30 del 4 de julio en CDMX
    const key = dayKeyIn(tz, instant);
    expect(key).toBe("2026-07-04");
    const { start, end } = dayRangeUtc(key, tz);
    expect(instant.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(instant.getTime()).toBeLessThan(end.getTime());
  });

  it("es consistente con dayKeyIn en zonas sin DST", () => {
    const { start, end } = dayRangeUtc("2026-07-04", "Asia/Tokyo");
    expect(dayKeyIn("Asia/Tokyo", start)).toBe("2026-07-04");
    expect(dayKeyIn("Asia/Tokyo", new Date(end.getTime() - 1))).toBe("2026-07-04");
    expect(dayKeyIn("Asia/Tokyo", end)).toBe("2026-07-05");
  });
});
