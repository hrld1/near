import { describe, expect, it } from "vitest";
import { DRAW_WORDS, guessMatches, normalizeGuess, randomWord } from "./draw-words";

describe("normalizeGuess", () => {
  it("quita tildes, signos y mayúsculas", () => {
    expect(normalizeGuess("Pingüino!")).toBe("pinguino");
    expect(normalizeGuess("  árbol ")).toBe("arbol");
    expect(normalizeGuess("CORAZÓN")).toBe("corazon");
  });
  it("colapsa espacios", () => {
    expect(normalizeGuess("oso   panda")).toBe("oso panda");
  });
});

describe("guessMatches", () => {
  it("acepta variantes sin tilde y con mayúsculas/signos", () => {
    expect(guessMatches("arbol", "árbol")).toBe(true);
    expect(guessMatches("Pingüino!", "pingüino")).toBe(true);
    expect(guessMatches("  CORAZON ", "corazón")).toBe(true);
  });
  it("rechaza lo que no coincide y lo vacío", () => {
    expect(guessMatches("gato", "perro")).toBe(false);
    expect(guessMatches("   ", "gato")).toBe(false);
  });
});

describe("randomWord", () => {
  it("siempre devuelve una palabra del pool", () => {
    for (let i = 0; i < 50; i++) expect(DRAW_WORDS).toContain(randomWord());
  });
  it("evita repetir la anterior", () => {
    // con 60+ palabras, nunca debería devolver la excluida
    for (let i = 0; i < 30; i++) expect(randomWord("gato")).not.toBe("gato");
  });
});
