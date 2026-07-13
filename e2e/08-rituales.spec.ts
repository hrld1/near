import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 8: los rituales recíprocos de Hoy — la pregunta del día (texto) y el
// momento del día (foto): NO ves lo del otro hasta compartir lo tuyo.

// PNG 1x1 rosa (67 bytes) para el momento del día
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test("pregunta y momento del día: revelación recíproca", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;

    // --- Pregunta del día ---
    const respuestaA = `Contigo, siempre ${Date.now()}`;
    await a.goto("/home");
    await a.locator('textarea[name="answer"]').fill(respuestaA);
    await a.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(a.getByText(respuestaA)).toBeVisible();

    // B: sabe que Ana respondió, pero NO ve el texto hasta responder
    await b.goto("/home");
    await expect(b.getByText(/ya respondio: responde para verlo/)).toBeVisible({ timeout: 20_000 });
    await expect(b.getByText(respuestaA)).toHaveCount(0);
    await b.locator('textarea[name="answer"]').fill("Yo también");
    await b.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(b.getByText(respuestaA)).toBeVisible(); // revelada

    // --- Momento del día (foto) ---
    await a.locator('input[type="file"]').setInputFiles({
      name: "momento.png",
      mimeType: "image/png",
      buffer: TINY_PNG
    });
    await expect(a.getByText("Esperando el momento de Leo…")).toBeVisible({ timeout: 20_000 });

    // B ve el candado ("ya ha compartido el suyo") pero no la foto
    await expect(b.getByText("Ana ya ha compartido el suyo")).toBeVisible({ timeout: 20_000 });
    await expect(b.locator('img[alt="El momento de Ana"]')).toHaveCount(0);

    // B comparte el suyo → se revela el de Ana
    await b.locator('input[type="file"]').setInputFiles({
      name: "momento-leo.png",
      mimeType: "image/png",
      buffer: TINY_PNG
    });
    await expect(b.locator('img[alt="El momento de Ana"]')).toBeVisible({ timeout: 20_000 });
    await expect(b.getByText("El momento de hoy, hecho por los dos 💞")).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
