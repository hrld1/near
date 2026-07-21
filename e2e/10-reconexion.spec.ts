import { expect, test } from "@playwright/test";
import { createCouple } from "./helpers";

// Flujo 10 (it32): la conexión en vivo se cae y vuelve. El bus no guarda
// historial, así que lo publicado durante el corte se pierde para siempre: al
// reconectar hay que volver a pedir los datos al servidor, no confiar en no
// haberse perdido nada. Antes de esto la app se quedaba enseñando lo último
// que vio, sin avisar y sin ponerse al día — con toda la apariencia de estar
// bien, que es lo peligroso.
test("al perder la conexión avisa, y al volver se pone al día", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a, b } = couple;
    await a.goto("/cerca");
    await b.goto("/cerca");

    // A se queda sin red. Tumba la conexión abierta, no solo las futuras, que
    // es lo que de verdad pasa cuando el servidor se reinicia en un despliegue
    // o cuando alguien entra en el metro.
    await a.context().setOffline(true);
    // El aviso tarda 2,5 s a propósito: un parpadeo no merece cartel.
    await expect(a.getByText("Reconectando…")).toBeVisible({ timeout: 30_000 });

    // Mientras A está a ciegas, B mete algo en el frasco. Ese evento se pierde:
    // A no puede enterarse por el bus.
    const texto = `Sin conexión ${Date.now()}`;
    await b.getByPlaceholder(/Algo que valoras/).fill(texto);
    await b.getByRole("button", { name: "Meter en el frasco" }).click();
    await expect(b.getByText(`“${texto}”`)).toBeVisible();
    await expect(a.getByText(`“${texto}”`)).toBeHidden(); // no lo ha visto

    // Vuelve la red: A reconecta y, al hacerlo, vuelve a pedir los datos. Sin
    // recargar la página a mano.
    await a.context().setOffline(false);
    await expect(a.getByText("Reconectando…")).toBeHidden({ timeout: 60_000 });
    await expect(a.getByText(`“${texto}”`)).toBeVisible({ timeout: 30_000 });
  } finally {
    await couple.dispose();
  }
});
