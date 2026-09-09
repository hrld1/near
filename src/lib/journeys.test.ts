import { describe, expect, it } from "vitest";
import { JOURNEYS, journeyByKey, journeyStepCardId, resolveJourneyStep } from "./journeys";
import { resolveCard } from "./decks";

describe("journeyStepCardId", () => {
  it("usa el namespace de tres segmentos viaje:<clave>:<paso>", () => {
    expect(journeyStepCardId("reencuentro", 2)).toBe("viaje:reencuentro:2");
  });
});

describe("resolveJourneyStep", () => {
  it("resuelve un paso válido a su viaje, índice y textos", () => {
    const r = resolveJourneyStep("viaje:reconoceros:0");
    expect(r?.journey.key).toBe("reconoceros");
    expect(r?.index).toBe(0);
    expect(r?.step.prompt).toBe(JOURNEYS[0].steps[0].prompt);
  });

  it("rechaza clave inexistente, índice fuera de rango y formato de mazo", () => {
    expect(resolveJourneyStep("viaje:noexiste:0")).toBeNull();
    expect(resolveJourneyStep("viaje:reconoceros:99")).toBeNull();
    expect(resolveJourneyStep("viaje:reconoceros:-1")).toBeNull();
    expect(resolveJourneyStep("viaje:reconoceros:x")).toBeNull();
    // un cardId de mazo (dos segmentos) no es un paso de viaje
    expect(resolveJourneyStep("recuerdos:0")).toBeNull();
  });
});

describe("no colisión entre viajes y mazos", () => {
  it("un cardId de paso de viaje nunca lo resuelve el motor de mazos", () => {
    for (const j of JOURNEYS) {
      for (let i = 0; i < j.steps.length; i++) {
        expect(resolveCard(journeyStepCardId(j.key, i))).toBeNull();
      }
    }
  });
});

describe("integridad del contenido", () => {
  it("cada viaje tiene pasos y textos no vacíos, y clave única", () => {
    const keys = new Set<string>();
    for (const j of JOURNEYS) {
      expect(j.steps.length).toBeGreaterThan(0);
      expect(keys.has(j.key)).toBe(false);
      keys.add(j.key);
      expect(journeyByKey(j.key)).toBe(j);
      for (const s of j.steps) {
        expect(s.title.trim()).not.toBe("");
        expect(s.intro.trim()).not.toBe("");
        expect(s.prompt.trim()).not.toBe("");
      }
    }
  });
});
