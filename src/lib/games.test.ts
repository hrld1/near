import { describe, expect, it } from "vitest";
import { GAMES, compareScores, gameOfDay, scrambleWord, wordsOfDay } from "./games";
import { shiftDayKey } from "./dates";

describe("GAMES", () => {
  it("todos los juegos declaran bounds coherentes", () => {
    for (const def of GAMES) {
      expect(def.scoreBounds.min).toBeLessThan(def.scoreBounds.max);
      expect(def.maxAttemptsPerDay).toBeGreaterThan(0);
    }
  });

  it("las keys son unicas", () => {
    const keys = GAMES.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("gameOfDay", () => {
  it("es determinista para la misma fecha", () => {
    expect(gameOfDay("2026-07-04").key).toBe(gameOfDay("2026-07-04").key);
  });

  it("rota de un día al siguiente cubriendo todos los juegos", () => {
    const days = Array.from({ length: GAMES.length }, (_, i) =>
      shiftDayKey("2026-07-01", i)
    );
    const games = new Set(days.map((k) => gameOfDay(k).key));
    expect(games.size).toBe(GAMES.length); // N días consecutivos cubren los N juegos
  });
});

describe("compareScores", () => {
  const lower = GAMES.find((g) => g.lowerIsBetter)!;
  const higher = GAMES.find((g) => !g.lowerIsBetter)!;

  it("con lowerIsBetter gana el menor", () => {
    expect(compareScores(lower, 100, 200)).toBe(-1);
    expect(compareScores(lower, 200, 100)).toBe(1);
    expect(compareScores(lower, 100, 100)).toBe(0);
  });

  it("sin lowerIsBetter gana el mayor", () => {
    expect(compareScores(higher, 200, 100)).toBe(-1);
    expect(compareScores(higher, 100, 200)).toBe(1);
  });
});

describe("wordsOfDay / scrambleWord", () => {
  it("las palabras del día son deterministas y sin repetir", () => {
    const a = wordsOfDay("2026-07-04");
    const b = wordsOfDay("2026-07-04");
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("scramble conserva las letras y nunca devuelve la palabra original", () => {
    for (const word of wordsOfDay("2026-07-04")) {
      const scrambled = scrambleWord(word, 1);
      expect(scrambled).not.toBe(word);
      expect([...scrambled].sort().join("")).toBe([...word].sort().join(""));
    }
  });
});
