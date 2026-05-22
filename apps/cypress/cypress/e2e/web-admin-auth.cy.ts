describe("web-admin auth", () => {
  it("renders the login page", () => {
    cy.visit("/login");

    cy.contains("Bem-vindo de volta!").should("be.visible");
    cy.contains("Entre na sua conta para continuar").should("be.visible");
    cy.contains("label", "E-mail").find("input").should("be.visible");
    cy.contains("label", "Senha").find("input").should("be.visible");
    cy.contains("button", "Entrar").should("be.visible");
  });

  it("navigates between auth screens", () => {
    cy.visit("/login");

    cy.contains("button", "Criar conta").click();
    cy.location("pathname").should("eq", "/register");
    cy.contains("Criar conta").should("be.visible");

    cy.contains("button", "Fazer login").click();
    cy.location("pathname").should("eq", "/login");

    cy.contains("Esqueci minha senha").click();
    cy.location("pathname").should("eq", "/forgot-password");
    cy.contains("Esqueci minha senha").should("be.visible");
  });
});
