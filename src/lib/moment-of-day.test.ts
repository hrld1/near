import { describe, expect, it } from "vitest";
import { MOMENT_THEMES, momentThemeOfDay } from "./moment-of-day";

describe("momentThemeOfDay", () => {
  it("es determinista para el mismo día", () => {
    expect(momentThemeOfDay("2026-07-06")).toBe(momentThemeOfDay("2026-07-06"));
  });

  it("siempre devuelve un tema del pool", () => {
    for (let d = 1; d <= 28; d++) {
      const key = `2026-07-${String(d).padStart(2, "0")}`;
      expect(MOMENT_THEMES).toContain(momentThemeOfDay(key));
    }
  });

  it("rota entre varios temas a lo largo de los días", () => {
    const seen = new Set(
      Array.from({ length: 30 }, (_, i) => momentThemeOfDay(`2026-07-${String((i % 28) + 1).padStart(2, "0")}`))
    );
    expect(seen.size).toBeGreaterThan(3);
  });
});
