import { expect, test, type Page } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 3: un duelo por turnos COMPLETO sobre el arnés de duelos (5 en raya):
// invitar → aceptar → turnos alternos relayados por SSE → victoria.

const N = 12; // GOMOKU_N

async function hasTurn(page: Page): Promise<boolean> {
  return (await page.getByText("— te toca").count()) > 0;
}

test("5 en raya en vivo: invitación, turnos y victoria", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/play/gomoku");
    await b.goto("/play/gomoku");

    await a.getByRole("button", { name: /Retar a Leo/ }).click();
    await expect(b.getByText(/te reta a 5 en raya/)).toBeVisible();
    await b.getByRole("button", { name: "Jugar", exact: true }).click();

    // ambos entran en partida; la semilla decide quién empieza
    await expect(a.locator("[data-cell]").first()).toBeVisible();
    await expect(b.locator("[data-cell]").first()).toBeVisible();
    await expect
      .poll(async () => (await hasTurn(a)) || (await hasTurn(b)), { timeout: 15_000 })
      .toBe(true);

    const aStarts = await hasTurn(a);
    const first = aStarts ? a : b; // gana con la fila 0
    const second = aStarts ? b : a; // responde en la fila 5

    for (let i = 0; i < 5; i++) {
      await expect(first.getByText("— te toca")).toBeVisible();
      await first.locator(`[data-cell="${i}"]`).click(); // fila 0, col i
      if (i < 4) {
        await expect(second.getByText("— te toca")).toBeVisible();
        await second.locator(`[data-cell="${5 * N + i}"]`).click(); // fila 5, col i
      }
    }

    await expect(first.getByText("¡Cinco en raya! Ganas.")).toBeVisible();
    await expect(second.getByText(/Gana (Ana|Leo)/)).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
