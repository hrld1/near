import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 1: registro de dos cuentas + vinculación por código. Es el propio
// helper — este spec lo afirma explícitamente y valida el estado final.
test("dos personas se registran y quedan vinculadas", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    // cada uno ve el nombre del otro en su Hoy
    await expect(couple.a.getByText("Leo").first()).toBeVisible();
    await expect(couple.b.getByText("Ana").first()).toBeVisible();
    // y el ritual del día está arriba
    await expect(couple.a.getByText("El momento de hoy")).toBeVisible();
    await expect(couple.b.getByText("Pregunta del día")).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
