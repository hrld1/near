import { describe, expect, it } from "vitest";
import { bestStreakInRange, duelsFromScores, evenSample, haversineKm, parsePeriod } from "./libro";
import { gameOfDay } from "./games";

const TZ = "Europe/Madrid";

describe("parsePeriod", () => {
  it("mes válido", () => {
    const p = parsePeriod("2026-07", TZ);
    expect(p.kind).toBe("month");
    expect(p.fromKey).toBe("2026-07-01");
    expect(p.toKey).toBe("2026-07-31");
    expect(p.label).toContain("julio");
    expect(p.label).toContain("2026");
  });

  it("año válido", () => {
    const p = parsePeriod("2026", TZ);
    expect(p.kind).toBe("year");
    expect(p.fromKey).toBe("2026-01-01");
    expect(p.toKey).toBe("2026-12-31");
  });

  it("basura → mes actual en la tz", () => {
    const p = parsePeriod("patata", TZ, new Date("2026-03-15T12:00:00Z"));
    expect(p.key).toBe("2026-03");
  });

  it("diciembre no desborda el año", () => {
    const p = parsePeriod("2026-12", TZ);
    expect(p.toKey).toBe("2026-12-31");
  });
});

describe("bestStreakInRange", () => {
  const A = "a";
  const B = "b";
  function byDay(days: Record<string, string[]>) {
    const m = new Map<string, Set<string>>();
    for (const [k, users] of Object.entries(days)) m.set(k, new Set(users));
    return m;
  }

  it("encuentra la mejor racha del período", () => {
    const m = byDay({
      "2026-07-01": [A, B],
      "2026-07-02": [A, B],
      "2026-07-03": [A], // rompe
      "2026-07-04": [A, B],
      "2026-07-05": [A, B],
      "2026-07-06": [A, B]
    });
    const r = bestStreakInRange(m, [A, B], "2026-07-01", "2026-07-31");
    expect(r.best).toBe(3);
    expect(r.totalComplete).toBe(5);
  });

  it("sin días completos → cero", () => {
    expect(bestStreakInRange(new Map(), [A, B], "2026-07-01", "2026-07-31").best).toBe(0);
  });
});

describe("haversineKm", () => {
  it("Madrid–Buenos Aires ≈ 10.000 km", () => {
    const km = haversineKm(40.4168, -3.7038, -34.6037, -58.3816);
    expect(km).toBeGreaterThan(9900);
    expect(km).toBeLessThan(10200);
  });

  it("mismo punto → 0", () => {
    expect(haversineKm(40, -3, 40, -3)).toBe(0);
  });
});

describe("duelsFromScores", () => {
  const A = "ana";
  const B = "leo";
  const DAY = "2026-07-10";
  const def = gameOfDay(DAY);

  it("resuelve ganador, empate e incompleto", () => {
    const better = def.lowerIsBetter ? 10 : 100;
    const worse = def.lowerIsBetter ? 100 : 10;
    const rows = [
      // día del duelo: ambos juegan, gana A
      { userId: A, gameKey: def.key, dateKey: DAY, score: better },
      { userId: B, gameKey: def.key, dateKey: DAY, score: worse },
      // otro día: solo A → incompleto, no cuenta
      { userId: A, gameKey: gameOfDay("2026-07-11").key, dateKey: "2026-07-11", score: 50 }
    ];
    const r = duelsFromScores(rows, [A, B]);
    expect(r.played).toBe(1);
    expect(r.wonBy[A]).toBe(1);
    expect(r.wonBy[B]).toBe(0);
    expect(r.draws).toBe(0);
  });

  it("empate exacto", () => {
    const rows = [
      { userId: A, gameKey: def.key, dateKey: DAY, score: 42 },
      { userId: B, gameKey: def.key, dateKey: DAY, score: 42 }
    ];
    const r = duelsFromScores(rows, [A, B]);
    expect(r.draws).toBe(1);
  });

  it("jugar otro juego que no es el del día no cuenta como duelo", () => {
    const otherKey = def.key === "reaction" ? "memory" : "reaction";
    const rows = [
      { userId: A, gameKey: otherKey, dateKey: DAY, score: 10 },
      { userId: B, gameKey: otherKey, dateKey: DAY, score: 20 }
    ];
    expect(duelsFromScores(rows, [A, B]).played).toBe(0);
  });
});

describe("evenSample", () => {
  it("respeta orden y extremos", () => {
    const s = evenSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4);
    expect(s[0]).toBe(1);
    expect(s[s.length - 1]).toBe(10);
    expect(s.length).toBe(4);
  });

  it("array corto se devuelve entero", () => {
    expect(evenSample([1, 2], 9)).toEqual([1, 2]);
  });
});
