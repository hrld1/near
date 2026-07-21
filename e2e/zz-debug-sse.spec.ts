import { test } from "@playwright/test";
import { createCouple } from "./helpers";

// TEMPORAL — diagnóstico de la reconexión. Borrar tras el arreglo.
test("debug: qué hace el EventSource al quedarse sin red", async ({ browser }) => {
  const couple = await createCouple(browser);
  try {
    const { a } = couple;
    await a.goto("/cerca");

    // Un EventSource propio para observar el comportamiento de cerca.
    await a.evaluate(() => {
      const w = window as unknown as { __log: string[]; __es?: EventSource };
      w.__log = [];
      const es = new EventSource("/api/stream");
      w.__es = es;
      es.onopen = () => w.__log.push(`open readyState=${es.readyState}`);
      es.onerror = () => w.__log.push(`ERROR readyState=${es.readyState}`);
    });
    await a.waitForTimeout(3000);
    console.log("\n=== antes de cortar:", await a.evaluate(() => (window as never as { __log: string[] }).__log));

    await a.context().setOffline(true);
    await a.waitForTimeout(12000);
    console.log("=== tras setOffline(12s):", await a.evaluate(() => (window as never as { __log: string[] }).__log));
    console.log("=== readyState:", await a.evaluate(() => (window as never as { __es: EventSource }).__es.readyState));
    console.log("=== navigator.onLine:", await a.evaluate(() => navigator.onLine));
    console.log("=== ¿está LiveConnection montado?:", await a.locator("body").innerText().then((t) => t.includes("Reconectando")));

    await a.context().setOffline(false);
    await a.waitForTimeout(8000);
    console.log("=== tras volver la red:", await a.evaluate(() => (window as never as { __log: string[] }).__log));
  } finally {
    await couple.dispose();
  }
});
