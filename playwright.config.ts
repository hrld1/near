import { defineConfig } from "@playwright/test";

// E2E de DOS JUGADORES (it26): cada spec crea una pareja nueva (dos contextos
// de navegador = dos personas) y ejercita un flujo vivo completo. Por defecto
// contra el servidor de producción local (requiere `npm run build` previo y la
// BD levantada). Ejecutar: `npm run test:e2e`.
//
// Contra un despliegue real (it31): BASE_URL=https://tu-dominio npm run
// test:e2e — no arranca servidor local y usa esa URL. OJO: crea parejas
// reales; hazlo solo en el estreno o en una instancia de staging.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const remote = !!process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  workers: 1, // los flujos comparten servidor y BD: en serie
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: "es-ES",
    timezoneId: "Europe/Madrid"
  },
  // contra un remoto no levantamos servidor local
  ...(remote
    ? {}
    : {
        webServer: {
          command: "npm start",
          url: "http://localhost:3000/login",
          reuseExistingServer: true,
          timeout: 90_000
        }
      })
});
