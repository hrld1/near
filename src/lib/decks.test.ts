import { describe, expect, it } from "vitest";
import { DECKS, deckByKey, levelRanges, resolveCard } from "./decks";

describe("mazo íntimo por niveles (it50)", () => {
  const intimate = DECKS.filter((d) => d.intimate);

  it("todo mazo íntimo declara niveles cuya suma cubre exactamente sus cartas", () => {
    expect(intimate.length).toBeGreaterThan(0);
    for (const d of intimate) {
      expect(d.levels, `${d.key} debe tener niveles`).toBeTruthy();
      const total = d.levels!.reduce((n, l) => n + l.count, 0);
      expect(total).toBe(d.cards.length);
    }
  });

  it("levelRanges parte las cartas en rangos contiguos sin huecos ni solapes", () => {
    const deck = deckByKey("intimidad")!;
    const ranges = levelRanges(deck.levels!);
    expect(ranges[0].start).toBe(0);
    expect(ranges[ranges.length - 1].end).toBe(deck.cards.length);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].start).toBe(ranges[i - 1].end);
    }
  });
});

describe("mazos no íntimos", () => {
  it("no declaran niveles", () => {
    for (const d of DECKS.filter((x) => !x.intimate)) {
      expect(d.levels).toBeUndefined();
    }
  });
});

describe("resolveCard sigue resolviendo las cartas del mazo íntimo", () => {
  it("cada carta del mazo íntimo resuelve a su texto por índice", () => {
    const deck = deckByKey("intimidad")!;
    for (let i = 0; i < deck.cards.length; i++) {
      const r = resolveCard(`intimidad:${i}`);
      expect(r?.text).toBe(deck.cards[i]);
    }
  });
});
