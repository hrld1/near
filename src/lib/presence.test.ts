import { describe, expect, it } from "vitest";
import { effectivePresence } from "./presence";

const NOW = new Date("2026-07-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

describe("effectivePresence", () => {
  it("mantiene un estado reciente", () => {
    expect(effectivePresence("FREE", hoursAgo(1), NOW)).toBe("FREE");
    expect(effectivePresence("STUDYING", hoursAgo(3.9), NOW)).toBe("STUDYING");
    expect(effectivePresence("SLEEPING", hoursAgo(11), NOW)).toBe("SLEEPING");
  });

  it("caduca segun el TTL del estado", () => {
    expect(effectivePresence("FREE", hoursAgo(5), NOW)).toBe("NONE");
    expect(effectivePresence("BUSY", hoursAgo(4.1), NOW)).toBe("NONE");
    expect(effectivePresence("SLEEPING", hoursAgo(13), NOW)).toBe("NONE");
  });

  it("NONE y estados sin fecha quedan en NONE", () => {
    expect(effectivePresence("NONE", hoursAgo(0), NOW)).toBe("NONE");
    expect(effectivePresence("FREE", null, NOW)).toBe("NONE");
    expect(effectivePresence("desconocido", hoursAgo(1), NOW)).toBe("NONE");
  });
});
