import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 7: Coincidir — cada uno marca una franja, el solapamiento aparece
// para los dos, y proponer la llamada crea el evento del calendario.

function tomorrowAt(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test("franjas → solapamiento → proponer llamada → calendario", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/coincidir");
    await b.goto("/coincidir");

    // A libre mañana 20:00–22:00; B libre mañana 21:00–23:00 → solape 21–22
    await a.fill('input[type="datetime-local"]', tomorrowAt(20));
    await a.getByRole("button", { name: "Añadir franja" }).click();
    await expect(a.getByText("Tus franjas")).toBeVisible();

    await b.fill('input[type="datetime-local"]', tomorrowAt(21));
    await b.getByRole("button", { name: "Añadir franja" }).click();

    // el solapamiento aparece para los dos (la vista de A se refresca en vivo)
    await expect(b.getByRole("button", { name: "Proponer llamada" })).toBeVisible();
    await expect(a.getByRole("button", { name: "Proponer llamada" })).toBeVisible({ timeout: 20_000 });

    // A propone: se confirma y el evento existe en el calendario de B
    await a.getByRole("button", { name: "Proponer llamada" }).click();
    await expect(a.getByText("Propuesta", { exact: true })).toBeVisible();
    await b.goto("/calendar");
    await expect(b.getByText("Llamada").first()).toBeVisible();
  } finally {
    await couple.dispose();
  }
});
