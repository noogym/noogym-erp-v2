import { defineConfig } from "cypress";

const baseUrl = process.env.CYPRESS_BASE_URL ?? "http://localhost:3000";
const apiUrl = process.env.CYPRESS_NOOGYM_API_URL ?? process.env.NOOGYM_API_URL ?? "http://localhost:3333";

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1440,
    viewportHeight: 900,
    env: {
      NOOGYM_API_URL: apiUrl,
      NOOGYM_E2E_EMAIL: process.env.NOOGYM_E2E_EMAIL ?? "admin@noogym.com",
      NOOGYM_E2E_PASSWORD: process.env.NOOGYM_E2E_PASSWORD ?? "Noogym@123"
    },
    video: true,
    screenshotOnRunFailure: true
  }
});
