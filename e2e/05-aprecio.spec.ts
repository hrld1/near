import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 5: el frasco de aprecio — lo que uno mete en el frasco le llega al
// otro EN VIVO (evento appreciation:new), sin recargar.
test("un aprecio cae en el frasco de los dos, en vivo", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/cerca");
    await b.goto("/cerca");

    const texto = `Admiro tu paciencia ${Date.now()}`;
    await a.getByPlaceholder(/Algo que valoras/).fill(texto);
    await a.getByRole("button", { name: "Meter en el frasco" }).click();

    await expect(a.getByText("Guardado en el frasco")).toBeVisible();
    await expect(a.getByText(`“${texto}”`)).toBeVisible(); // en mi frasco
    await expect(b.getByText(`“${texto}”`)).toBeVisible(); // en vivo en el suyo
  } finally {
    await couple.dispose();
  }
});
