import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 6: Reparar — tender la mano llega como aviso global esté donde esté
// la pareja, se acepta de un toque, y la reflexión "después de la tormenta"
// se revela solo cuando ambos la comparten.
test("tender la mano + aftermath recíproco", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/reparar");
    await b.goto("/home"); // B está en cualquier otra pantalla

    // A tiende la mano con un gesto
    await a.getByRole("button", { name: "¿Podemos empezar de nuevo?" }).click();
    await expect(a.getByText(/Le has tendido la mano/)).toBeVisible();

    // B ve el aviso global y acepta
    await expect(b.getByText("Ana te tiende la mano")).toBeVisible();
    await b.getByRole("button", { name: /Acepto/ }).click();
    await expect(a.getByText("Leo ha aceptado tu mano 💛")).toBeVisible();

    // Después de la tormenta: A comparte su reflexión
    await a.getByRole("button", { name: "Dolido/a" }).click();
    await a.getByPlaceholder(/sin culpar/).fill("Sentí que no me escuchabas cuando hablamos de las vacaciones.");
    await a.getByPlaceholder(/te ayudaría/).fill("Que repitamos la conversación con calma este finde.");
    await a.getByRole("button", { name: "Compartir mi reflexión" }).click();
    await expect(a.getByText(/aún no ha compartido su reflexión/)).toBeVisible();

    // B abre Reparar: sabe que hay reflexión pero NO la ve hasta compartir la suya
    await b.goto("/reparar");
    await expect(b.getByText(/ya compartió la suya: responde para verla/)).toBeVisible();
    await expect(b.getByText(/no me escuchabas/)).toHaveCount(0); // reciprocidad
    await b.getByRole("button", { name: "No escuchado/a" }).click();
    await b.getByPlaceholder(/sin culpar/).fill("Yo también lo pasé mal, estaba agotado.");
    await b.getByPlaceholder(/te ayudaría/).fill("Un abrazo largo cuando nos veamos.");
    await b.getByRole("button", { name: "Compartir mi reflexión" }).click();

    // ahora B ve AMBAS reflexiones
    await expect(b.getByText(/no me escuchabas/)).toBeVisible();
    await expect(b.getByText(/Os habéis contado cómo os sentisteis/)).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
