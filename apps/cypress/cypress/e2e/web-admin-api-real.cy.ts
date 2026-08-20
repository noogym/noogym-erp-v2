describe("web-admin com API real", () => {
  const apiUrl = Cypress.env("NOOGYM_API_URL") as string;
  const email = Cypress.env("NOOGYM_E2E_EMAIL") as string;
  const password = Cypress.env("NOOGYM_E2E_PASSWORD") as string;

  before(() => {
    cy.request({ url: `${apiUrl}/health/ready`, failOnStatusCode: false })
      .its("status")
      .should("eq", 200);
  });

  it("entra e carrega modulos principais da API", () => {
    cy.intercept("GET", `${apiUrl}/members*`).as("members");
    cy.intercept("GET", `${apiUrl}/plans*`).as("plans");
    cy.intercept("GET", `${apiUrl}/products*`).as("products");

    cy.visit("/login");
    cy.contains("label", "E-mail").find("input").clear().type(email);
    cy.contains("label", "Senha").find("input").clear().type(password, { log: false });
    cy.contains("button", "Entrar").click();

    cy.wait("@members", { timeout: 20000 }).its("response.statusCode").should("be.oneOf", [200, 304]);
    cy.wait("@plans", { timeout: 20000 }).its("response.statusCode").should("be.oneOf", [200, 304]);
    cy.wait("@products", { timeout: 20000 }).its("response.statusCode").should("be.oneOf", [200, 304]);
    cy.contains("Dashboard", { timeout: 20000 }).should("be.visible");
    cy.contains("Clientes ativos").should("be.visible");
  });
});
