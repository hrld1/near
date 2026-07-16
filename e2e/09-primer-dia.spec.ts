import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 9 (it30): el primer día guiado. Una pareja recién vinculada ve la
// lista de 4 pasos con el progreso de los DOS; completar un paso se refleja
// en ambos lados sin recargar (LiveRefresh). El día 1 no hay descubrimiento.

test("vuestro primer día: la lista guía y el progreso es recíproco", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;

    // ambos ven la lista del primer día, a cero
    await expect(a.getByText("Vuestro primer día")).toBeVisible();
    await expect(b.getByText("Vuestro primer día")).toBeVisible();
    await expect(a.getByText("Tú 0/4 · Leo 0/4")).toBeVisible();
    await expect(b.getByText("Tú 0/4 · Ana 0/4")).toBeVisible();

    // el día 1 manda la lista: sin tarjeta de descubrimiento
    await expect(a.getByText("descubrid hoy")).toHaveCount(0);

    // Ana completa el primer paso: decir qué hace ahora
    await a.getByRole("button", { name: "Libre" }).click();
    await expect(a.getByText("Tú 1/4 · Leo 0/4")).toBeVisible({ timeout: 20_000 });

    // Leo ve el progreso de Ana en su propia lista, en vivo
    await expect(b.getByText("Tú 0/4 · Ana 1/4")).toBeVisible({ timeout: 20_000 });
    await expect(b.getByText("Ana ✓")).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
