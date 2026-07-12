import { describe, expect, it } from "vitest";
import { buildCitasSystem, planSchema, sunsetUtc } from "./citas";

describe("sunsetUtc", () => {
  it("Alicante a finales de julio: ocaso ~19:2x UTC (21:2x local)", () => {
    const s = sunsetUtc("2026-07-25", 38.35, -0.48);
    expect(s).not.toBeNull();
    const minutes = s!.getUTCHours() * 60 + s!.getUTCMinutes();
    // margen amplio: la aproximación NOAA es ±2 min, el test no debe ser frágil
    expect(minutes).toBeGreaterThan(19 * 60 - 20);
    expect(minutes).toBeLessThan(19 * 60 + 50);
  });

  it("invierno atardece antes que verano (hemisferio norte)", () => {
    const jul = sunsetUtc("2026-07-25", 40.4, -3.7)!; // Madrid
    const dec = sunsetUtc("2026-12-21", 40.4, -3.7)!;
    const mins = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
    expect(mins(dec)).toBeLessThan(mins(jul));
  });

  it("sol de medianoche: sin ocaso", () => {
    expect(sunsetUtc("2026-06-21", 78.2, 15.6)).toBeNull(); // Svalbard
  });
});

describe("planSchema", () => {
  const base = {
    title: "Bolos, atardecer y cine",
    mode: "juntos",
    city: "Alicante",
    date: "2026-07-25",
    budget: "~50 €",
    steps: [
      { time: "17:30", place: "Ozone Bowling", note: "2 partidas + zapatos", cost: "22 €" },
      { time: "20:45", place: "La Ereta", note: "Atardecer a las 21:27" }
    ]
  };

  it("acepta un plan válido", () => {
    expect(planSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza horas mal formadas", () => {
    const bad = { ...base, steps: [{ ...base.steps[0], time: "25:99" }, base.steps[1]] };
    expect(planSchema.safeParse(bad).success).toBe(false);
  });

  it("exige al menos dos pasos", () => {
    expect(planSchema.safeParse({ ...base, steps: [base.steps[0]] }).success).toBe(false);
  });

  it("rechaza un modo desconocido", () => {
    expect(planSchema.safeParse({ ...base, mode: "teletransporte" }).success).toBe(false);
  });
});

describe("buildCitasSystem", () => {
  it("incluye contexto y reglas clave", () => {
    const sys = buildCitasSystem({
      me: { name: "Héctor", city: "Alicante", timezone: "Europe/Madrid", lat: 38.35, lon: -0.48 },
      partner: { name: "Leo", city: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires", lat: -34.6, lon: -58.4 },
      todayKey: "2026-07-12",
      anniversary: "2024-03-08",
      upcomingEvents: [{ title: "Visita", whenLocal: "viernes, 24 jul 10:00" }],
      overlaps: [{ dayLabel: "sábado, 18 jul", myRange: "20:00–22:00", partnerRange: "15:00–17:00" }]
    });
    expect(sys).toContain("Héctor");
    expect(sys).toContain("Buenos Aires");
    expect(sys).toContain("guardar_cita");
    expect(sys).toContain("/date-room");
    expect(sys).toContain("Coincidir");
    expect(sys).toContain("Nunca afirmes haber reservado");
  });
});
