import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Utilidades del harness de dos jugadores: crear una PAREJA NUEVA por spec
// (registro real de dos cuentas + vinculación por código). Así cada flujo se
// prueba sobre un espacio limpio y además se ejercita el onboarding entero.

export type CoupleSession = {
  a: Page; // Ana: quien invita
  b: Page; // Leo: quien canjea el código
  aName: string;
  bName: string;
  dispose: () => Promise<void>;
};

let seq = 0;

export async function registerUser(context: BrowserContext, name: string, email: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/register");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "e2e-neardemo-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/onboarding", { timeout: 30_000 });
  return page;
}

export async function createCouple(browser: Browser): Promise<CoupleSession> {
  const stamp = `${Date.now().toString(36)}-${seq++}`;
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();

  // Ana se registra e invita
  const a = await registerUser(ctxA, "Ana", `e2e-ana-${stamp}@near.test`);
  await a.getByRole("button", { name: "Generar código" }).click();
  const codeButton = a.locator("button", { hasText: /NEAR-/ }).first();
  await expect(codeButton).toBeVisible();
  const code = ((await codeButton.innerText()).match(/NEAR-[A-Z0-9]+/) ?? [])[0];
  expect(code, "el código de invitación debe existir").toBeTruthy();

  // Leo se registra y canjea
  const b = await registerUser(ctxB, "Leo", `e2e-leo-${stamp}@near.test`);
  await b.fill('input[name="code"]', code!);
  await b.getByRole("button", { name: "Vincularnos" }).click();
  await b.waitForURL("**/home", { timeout: 30_000 });

  // Ana (que sondea cada 4 s) acaba en /home
  await a.waitForURL("**/home", { timeout: 30_000 });

  return {
    a,
    b,
    aName: "Ana",
    bName: "Leo",
    dispose: async () => {
      await ctxA.close();
      await ctxB.close();
    }
  };
}
