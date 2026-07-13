import { defineConfig } from "@playwright/test";

// E2E de DOS JUGADORES (it26): cada spec crea una pareja nueva (dos contextos
// de navegador = dos personas) y ejercita un flujo vivo completo contra el
// servidor de producción local. Requiere `npm run build` previo y la BD de
// dev levantada (docker compose up -d). Ejecutar: `npm run test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  workers: 1, // los flujos comparten servidor y BD: en serie
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-ES",
    timezoneId: "Europe/Madrid"
  },
  webServer: {
    command: "npm start",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 90_000
  }
});
