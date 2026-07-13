import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 4: el "Duelo en vivo" de un juego de puntuación (carrera): invitar →
// aceptar → cuenta atrás → jugando con la barra "vs" — y el abandono avisa.
test("carrera en vivo: lobby, cuenta atrás, barra vs y abandono", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/play/meteor/vs");
    await b.goto("/play/meteor/vs");

    await a.getByRole("button", { name: /Retar a Leo/ }).click();
    await expect(b.getByText(/te reta a Meteoros/)).toBeVisible();
    await b.getByRole("button", { name: "Jugar", exact: true }).click();

    // ambos llegan a la partida (la cuenta atrás 3·2·1 dura ~3 s: no la
    // afirmamos en los dos para no perderla por timing)
    await expect(a.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(b.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(a.getByText("Leo", { exact: true }).first()).toBeVisible();
    await expect(b.getByText("Ana", { exact: true }).first()).toBeVisible();

    // A se marcha a mitad (navegación SPA, como en uso real: el cleanup del
    // arnés envía el "quit"; una navegación dura no da tiempo a avisar)
    await a.getByRole("link", { name: "Meteoros" }).click();
    await expect(b.getByText(/ha salido del duelo/)).toBeVisible({ timeout: 20_000 });
    await expect(b.getByRole("button", { name: /Retar a Ana/ })).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
