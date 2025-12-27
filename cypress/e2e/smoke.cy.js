describe('Smoke: core navigation', () => {
  const loadSampleSystem = () => {
    cy.visit('/?view=systemsView');
    cy.get('#systemsGrid', { timeout: 10000 }).should('exist');
    cy.contains('.system-card__title', 'StreamView')
      .should('exist')
      .closest('.system-card')
      .find('button[data-action="load"]')
      .click({ force: true });
    cy.get('#visualizationCarousel', { timeout: 10000 }).should('exist');
  };

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('loads the StreamView sample system from Systems', () => {
    loadSampleSystem();
    cy.location('search').should('include', 'view=visualizationCarousel');
  });

  it('opens the Roadmap & Backlog Add Initiative modal', () => {
    loadSampleSystem();
    cy.contains('.nav-item', 'Roadmap & Backlog').click();
    cy.get('#roadmapViewContainer', { timeout: 10000 }).should('exist');
    cy.get('.roadmap-actions-row').contains('button', 'Add Initiative').click();
    cy.get('#roadmapInitiativeModal').should('have.class', 'is-open');
  });
});
