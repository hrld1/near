import { describe, expect, it } from "vitest";
import { TRIVIA, TRIVIA_CATEGORIES, triviaById } from "./trivia";

describe("contenido del duelo de ingenio (it52)", () => {
  it("cada pregunta tiene id único, opciones y un índice correcto válido", () => {
    const ids = new Set<string>();
    for (const q of TRIVIA) {
      expect(ids.has(q.id), `id duplicado: ${q.id}`).toBe(false);
      ids.add(q.id);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.question.trim()).not.toBe("");
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
      expect(q.options.every((o) => o.trim() !== "")).toBe(true);
      expect(TRIVIA_CATEGORIES[q.category]).toBeTruthy();
    }
  });

  it("triviaById resuelve por id y devuelve null para uno inexistente", () => {
    expect(triviaById(TRIVIA[0].id)).toBe(TRIVIA[0]);
    expect(triviaById("no-existe")).toBeNull();
  });

  it("la respuesta correcta no está SIEMPRE en la misma posición (duelo justo)", () => {
    const positions = new Set(TRIVIA.map((q) => q.correct));
    expect(positions.size).toBeGreaterThan(1);
  });
});
