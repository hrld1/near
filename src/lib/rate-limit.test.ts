import { describe, expect, it } from "vitest";
import { createLoginLimiter, LOGIN_MAX_ATTEMPTS } from "./rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("loginLimiter", () => {
  it("permite intentos por debajo del límite", () => {
    const c = clock();
    const l = createLoginLimiter(c.now);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) l.fail("a@a.com");
    expect(l.blockedFor("a@a.com")).toBe(0);
  });

  it("bloquea al quinto fallo, 1 minuto", () => {
    const c = clock();
    const l = createLoginLimiter(c.now);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) l.fail("a@a.com");
    expect(l.blockedFor("a@a.com")).toBe(60_000);
    c.advance(61_000);
    expect(l.blockedFor("a@a.com")).toBe(0); // enfriado
  });

  it("el enfriamiento crece exponencialmente hasta 15 min", () => {
    const c = clock();
    const l = createLoginLimiter(c.now);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) l.fail("a@a.com");
    c.advance(61_000);
    expect(l.fail("a@a.com")).toBe(120_000); // 6º fallo → 2 min
    c.advance(121_000);
    expect(l.fail("a@a.com")).toBe(240_000); // 7º → 4 min
    for (let i = 0; i < 10; i++) {
      c.advance(16 * 60_000);
      expect(l.fail("a@a.com")).toBeLessThanOrEqual(15 * 60_000); // tope
    }
  });

  it("un login correcto resetea", () => {
    const c = clock();
    const l = createLoginLimiter(c.now);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) l.fail("a@a.com");
    l.ok("a@a.com");
    expect(l.blockedFor("a@a.com")).toBe(0);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) l.fail("a@a.com");
    expect(l.blockedFor("a@a.com")).toBe(0);
  });

  it("los fallos antiguos se olvidan (1 h)", () => {
    const c = clock();
    const l = createLoginLimiter(c.now);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) l.fail("a@a.com");
    c.advance(61 * 60_000);
    l.fail("a@a.com"); // cuenta desde cero
    expect(l.blockedFor("a@a.com")).toBe(0);
  });

  it("identidades independientes", () => {
    const c = clock();
    const l = createLoginLimiter(c.now);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) l.fail("a@a.com");
    expect(l.blockedFor("b@b.com")).toBe(0);
  });
});
