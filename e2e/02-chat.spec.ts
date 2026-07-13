import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 2: chat en vivo por SSE — lo que uno escribe, el otro lo ve sin
// recargar, y viceversa.
test("el chat llega en vivo en ambas direcciones", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/chat");
    await b.goto("/chat");

    const fromA = `hola desde Ana ${Date.now()}`;
    await a.getByPlaceholder(/Escribe a/).fill(fromA);
    await a.keyboard.press("Enter");
    await expect(a.getByText(fromA)).toBeVisible(); // eco propio
    await expect(b.getByText(fromA)).toBeVisible(); // en vivo en B

    const fromB = `hola desde Leo ${Date.now()}`;
    await b.getByPlaceholder(/Escribe a/).fill(fromB);
    await b.keyboard.press("Enter");
    await expect(a.getByText(fromB)).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
