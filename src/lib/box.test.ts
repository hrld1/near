import { describe, expect, it } from "vitest";
import { DARES, GESTURES, QUESTIONS, pickBox } from "./box";

describe("pickBox", () => {
  it("es determinista para la misma semilla", () => {
    expect(pickBox(1234, null)).toEqual(pickBox(1234, null));
    expect(pickBox(1234, "recuerdo")).toEqual(pickBox(1234, "recuerdo"));
  });

  it("sin flashback nunca devuelve FLASHBACK", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(pickBox(seed, null).kind).not.toBe("FLASHBACK");
    }
  });

  it("con flashback lo devuelve para las semillas que tocan", () => {
    const kinds = new Set(
      Array.from({ length: 50 }, (_, seed) => pickBox(seed, "recuerdo").kind)
    );
    expect(kinds.has("FLASHBACK")).toBe(true);
  });

  it("el texto sale del pool correspondiente", () => {
    for (let seed = 0; seed < 30; seed++) {
      const box = pickBox(seed, null);
      const pool =
        box.kind === "DARE" ? DARES : box.kind === "QUESTION" ? QUESTIONS : GESTURES;
      expect(pool).toContain(box.text);
    }
  });
});
