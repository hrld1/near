import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// TEMPORAL — diagnóstico del abandono. Borrar tras el arreglo.
test("debug: cuánto tarda en navegar al salir del duelo", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;

    let actions = 0;
    let quitAt = 0;
    let t0 = 0;
    a.on("request", (r) => {
      const u = r.url();
      if (r.method() === "POST" && u.includes("/play/meteor/vs")) actions++;
      if (u.includes("/api/quit")) quitAt = Date.now() - t0;
    });

    await a.goto("/play/meteor/vs");
    await b.goto("/play/meteor/vs");
    await a.getByRole("button", { name: /Retar a Leo/ }).click();
    await expect(b.getByText(/te reta a Meteoros/)).toBeVisible();
    await b.getByRole("button", { name: "Jugar", exact: true }).click();
    await expect(a.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(b.locator("canvas")).toBeVisible({ timeout: 20_000 });

    // deja correr la partida para que se acumulen señales de marcador
    await a.waitForTimeout(3000);
    const before = actions;

    t0 = Date.now();
    await a.getByRole("link", { name: "Meteoros" }).click();

    let navAt = 0;
    for (let i = 0; i < 150; i++) {
      if (!a.url().includes("/vs")) {
        navAt = Date.now() - t0;
        break;
      }
      await a.waitForTimeout(200);
    }

    let seenAt = 0;
    for (let i = 0; i < 150; i++) {
      if ((await b.getByText(/ha salido del duelo/).count()) > 0) {
        seenAt = Date.now() - t0;
        break;
      }
      await b.waitForTimeout(200);
    }

    console.log("\n########## RESULTADO ##########");
    console.log("acciones de marcador antes de salir:", before);
    console.log("acciones de marcador DESPUES del clic:", actions - before);
    console.log("ms hasta que la URL cambia:", navAt || "NUNCA (>30s)");
    console.log("ms hasta el POST /api/quit:", quitAt || "NUNCA");
    console.log("ms hasta que B lo ve:", seenAt || "NUNCA (>30s)");
    console.log("###############################\n");
  } finally {
    await couple.dispose();
  }
});
