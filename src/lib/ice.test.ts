import { describe, expect, it } from "vitest";
import { normalizeIceServers } from "./ice";

describe("normalizeIceServers", () => {
  it("acepta la forma objeto único de Cloudflare", () => {
    const servers = normalizeIceServers({
      iceServers: {
        urls: ["stun:stun.cloudflare.com:3478", "turn:turn.cloudflare.com:3478?transport=udp"],
        username: "u",
        credential: "c"
      }
    });
    expect(servers).toHaveLength(1);
    expect(servers[0].username).toBe("u");
    expect(Array.isArray(servers[0].urls)).toBe(true);
  });

  it("acepta la forma lista", () => {
    const servers = normalizeIceServers({
      iceServers: [
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "turns:turn.cloudflare.com:5349?transport=tcp", username: "u", credential: "c" }
      ]
    });
    expect(servers).toHaveLength(2);
    expect(servers[1].credential).toBe("c");
  });

  it("descarta entradas sin urls válidas y basura", () => {
    expect(normalizeIceServers(null)).toEqual([]);
    expect(normalizeIceServers("turn")).toEqual([]);
    expect(normalizeIceServers({ iceServers: [{ username: "sin-urls" }, 42, null] })).toEqual([]);
    expect(normalizeIceServers({ iceServers: [{ urls: [] }] })).toEqual([]);
  });
});
