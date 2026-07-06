import { describe, expect, it } from "vitest";
import {
  computeStreak,
  hashString,
  pickDailyMissions,
  seasonLevel,
  SEASON_LEVELS,
  type Mission
} from "./engagement-core";
import { shiftDayKey } from "./dates";

const A = "user-a";
const B = "user-b";
const TODAY = "2026-07-04";

// byDay a partir de "que días completo cada uno", relativo a TODAY
function activity(daysAgoA: number[], daysAgoB: number[]) {
  const byDay = new Map<string, Set<string>>();
  const add = (userId: string, daysAgo: number) => {
    const key = shiftDayKey(TODAY, -daysAgo);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)!.add(userId);
  };
  daysAgoA.forEach((d) => add(A, d));
  daysAgoB.forEach((d) => add(B, d));
  return byDay;
}

describe("computeStreak", () => {
  it("cuenta días consecutivos completos incluyendo hoy", () => {
    const result = computeStreak(activity([0, 1, 2], [0, 1, 2]), [A, B], TODAY);
    expect(result).toEqual({ streak: 3, todayComplete: true });
  });

  it("hoy incompleto no rompe la racha (empieza en ayer)", () => {
    const result = computeStreak(activity([0, 1, 2], [1, 2]), [A, B], TODAY);
    expect(result).toEqual({ streak: 2, todayComplete: false });
  });

  it("un hueco corta la racha", () => {
    // completos hoy y hace 2 días; ayer solo A
    const result = computeStreak(activity([0, 1, 2], [0, 2]), [A, B], TODAY);
    expect(result).toEqual({ streak: 1, todayComplete: true });
  });

  it("sin pareja completa no hay racha", () => {
    expect(computeStreak(activity([0, 1], []), [A, B], TODAY).streak).toBe(0);
    expect(computeStreak(activity([0], [0]), [A], TODAY).streak).toBe(0); // 1 miembro
  });

  it("se detiene en la ventana de 120 días", () => {
    const days = Array.from({ length: 200 }, (_, i) => i);
    const result = computeStreak(activity(days, days), [A, B], TODAY);
    expect(result.streak).toBe(121); // hoy + 120 anteriores
  });
});

function missionPool(): Mission[] {
  return ["duel", "mood", "prompt", "moment", "photo", "nudge", "box"].map((id) => ({
    id,
    label: id,
    points: 5,
    done: false,
    href: "/"
  }));
}

describe("pickDailyMissions", () => {
  it("devuelve siempre 3 misiones con el duelo incluido y sin duplicados", () => {
    for (let seed = 0; seed < 500; seed++) {
      const picked = pickDailyMissions(seed, missionPool());
      expect(picked).toHaveLength(3);
      expect(picked[0].id).toBe("duel");
      expect(new Set(picked.map((m) => m.id)).size).toBe(3);
    }
  });

  it("es determinista para la misma semilla", () => {
    const seed = hashString("2026-07-04:couple-1");
    expect(pickDailyMissions(seed, missionPool()).map((m) => m.id)).toEqual(
      pickDailyMissions(seed, missionPool()).map((m) => m.id)
    );
  });

  it("semillas distintas producen sets distintos (rotacion real)", () => {
    const sets = new Set(
      Array.from({ length: 30 }, (_, seed) =>
        pickDailyMissions(seed, missionPool())
          .map((m) => m.id)
          .join(",")
      )
    );
    expect(sets.size).toBeGreaterThan(1);
  });
});

describe("seasonLevel", () => {
  it("resuelve el nivel por umbral", () => {
    expect(seasonLevel(0).name).toBe("Chispa");
    expect(seasonLevel(119).name).toBe("Chispa");
    expect(seasonLevel(120).name).toBe("Llama");
    expect(seasonLevel(5000).name).toBe("Supernova");
  });

  it("expone el siguiente nivel (o null en el último)", () => {
    expect(seasonLevel(0).next?.name).toBe("Llama");
    expect(seasonLevel(1100).next).toBeNull();
    expect(seasonLevel(1100).index).toBe(SEASON_LEVELS.length - 1);
  });
});
