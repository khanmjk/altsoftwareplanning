describe('Community Blueprints flows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('searches by availability, trust, category, and tags', () => {
    cy.visit('/?view=communityBlueprintsView');
    cy.get('#communityBlueprintGrid', { timeout: 10000 }).should('exist');
    cy.get('#communityBlueprintCount').should('contain.text', '100 curated, 0 local');

    cy.get('#blueprintQueryInput').clear().type('Available');
    cy.get('.community-blueprint-card', { timeout: 10000 }).should('have.length.greaterThan', 0);
    cy.get('.community-blueprint-card').each(($card) => {
      cy.wrap($card).should('have.attr', 'data-availability-status', 'Available');
    });

    cy.get('#blueprintQueryInput').clear().type('Verified');
    cy.get('.community-blueprint-card', { timeout: 10000 }).should('have.length.greaterThan', 0);
    cy.get('.community-blueprint-card__trust').first().should('contain.text', 'Verified');

    cy.get('#blueprintQueryInput').clear().type('Marketplace and Mobility');
    cy.get('.community-blueprint-card__meta', { timeout: 10000 })
      .first()
      .should('contain.text', 'Marketplace and Mobility');

    cy.get('#blueprintQueryInput').clear().type('mobility');
    cy.get('.community-blueprint-card', { timeout: 10000 }).should('have.length.greaterThan', 0);

    cy.get('#blueprintQueryInput').clear().type('Needs Contribution');
    cy.get('.community-blueprint-card', { timeout: 10000 }).should('have.length.greaterThan', 0);
    cy.get('.community-blueprint-card')
      .first()
      .within(() => {
        cy.contains('button', 'Contribute with AI').should('exist');
        cy.get('[data-action="install-blueprint-card"]').should('be.disabled');
      });
  });

  it('browses, previews, and installs a curated blueprint', () => {
    cy.visit('/?view=communityBlueprintsView');
    cy.get('#communityBlueprintGrid', { timeout: 10000 }).should('exist');

    cy.get('.community-blueprint-card').should('have.length.greaterThan', 10);
    cy.get('.community-blueprint-card[data-availability-status="Available"]')
      .first()
      .as('availableCard');

    cy.get('@availableCard')
      .find('.community-blueprint-card__title')
      .invoke('text')
      .then((rawTitle) => {
        const title = rawTitle.trim();
        cy.wrap(title).as('selectedTitle');
      });

    cy.get('@availableCard').find('[data-action="open-preview"]').click();
    cy.get('#blueprintPreviewModal').should('be.visible');
    cy.contains('#blueprintPreviewBody h4', 'Prompt Pack').should('exist');
    cy.contains('#blueprintPreviewBody h4', 'Learning Outcomes').should('exist');

    cy.get('#blueprintPreviewModal [data-action="install-blueprint"]')
      .should('not.be.disabled')
      .click();
    cy.location('search').should('include', 'view=systemsView');

    cy.get('@selectedTitle').then((selectedTitle) => {
      cy.contains('.system-card__title', `${selectedTitle} Blueprint`, { timeout: 10000 }).should(
        'exist'
      );
    });
  });

  it('shows installed lifecycle actions after installing a blueprint', () => {
    cy.visit('/?view=communityBlueprintsView');
    cy.get('#communityBlueprintGrid', { timeout: 10000 }).should('exist');

    cy.get('.community-blueprint-card[data-availability-status="Available"]')
      .first()
      .as('availableCard');

    cy.get('@availableCard')
      .find('.community-blueprint-card__title')
      .invoke('text')
      .then((rawTitle) => {
        const title = rawTitle.trim();
        cy.wrap(title).as('selectedTitle');
      });

    cy.get('@availableCard').find('[data-action="open-preview"]').click();
    cy.get('#blueprintPreviewInstallBtn').should('contain.text', 'Install Blueprint').click();
    cy.location('search').should('include', 'view=systemsView');

    cy.visit('/?view=communityBlueprintsView');
    cy.get('@selectedTitle').then((selectedTitle) => {
      cy.get('#blueprintQueryInput').clear().type(selectedTitle);
      cy.contains('.community-blueprint-card__title', selectedTitle, { timeout: 10000 })
        .closest('.community-blueprint-card')
        .as('installedCard');

      cy.get('@installedCard')
        .invoke('attr', 'data-installed-count')
        .then((value) => {
          expect(Number(value)).to.be.greaterThan(0);
        });

      cy.get('@installedCard').within(() => {
        cy.contains('.community-blueprint-card__availability', 'Installed').should('exist');
        cy.contains('button', 'Open Installed').should('exist');
        cy.contains('button', 'Install Another Copy').should('exist');
      });

      cy.get('@installedCard')
        .find('[data-action="open-preview"]')
        .then(($button) => {
          expect($button).to.have.length(1);
          const button = $button.get(0);
          button.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
        });
    });

    cy.get('#blueprintPreviewModal').should('be.visible');
    cy.get('#blueprintPreviewOpenInstalledBtn')
      .should('be.visible')
      .and('contain.text', 'Open Installed');
    cy.get('#blueprintPreviewInstallBtn')
      .should('not.be.disabled')
      .and('contain.text', 'Install Another Copy');

    cy.get('#blueprintPreviewOpenInstalledBtn').click();
    cy.location('search').should('include', 'view=visualizationCarousel');
  });

  it('publishes a local system into the community catalog', () => {
    const publishedTitle = `Cypress Community Blueprint ${Date.now()}`;

    // Install one curated blueprint first to create a user system entry.
    cy.visit('/?view=communityBlueprintsView');
    cy.get('.community-blueprint-card[data-availability-status="Available"]')
      .first()
      .find('[data-action="open-preview"]')
      .click();
    cy.get('#blueprintPreviewModal [data-action="install-blueprint"]').click();
    cy.location('search').should('include', 'view=systemsView');

    // Open publish flow from the installed system card.
    cy.get('.systems-section__title').contains('My Systems').should('exist');
    cy.get('.systems-section').first().find('button[data-action="publish-system"]').first().click();

    cy.location('search').should('include', 'view=communityBlueprintsView');
    cy.get('#blueprintPublishModal').should('be.visible');

    cy.get('#publishTitleInput').clear().type(publishedTitle);
    cy.get('#publishCategoryInput').clear().type('Education');
    cy.get('#publishTagsInput').clear().type('community, cypress, publish');
    cy.get('#publishSeedPromptInput')
      .clear()
      .type('Generate a strict JSON SMT system with goals, initiatives, and work packages.');

    cy.get('#blueprintPublishModal [data-action="publish-validate"]').click();
    cy.contains('#publishValidationResults', 'Validation passed.', { timeout: 10000 }).should(
      'exist'
    );

    cy.get('#blueprintPublishModal [data-action="publish-download"]').click();
    cy.contains('.toast-message', 'Downloaded', { timeout: 10000 }).should('exist');

    cy.get('#blueprintPublishModal [data-action="publish-save-local"]').click();
    cy.get('#blueprintPublishModal').should('not.be.visible');

    cy.get('#blueprintQueryInput').clear().type(publishedTitle);
    cy.contains('.community-blueprint-card__title', publishedTitle, { timeout: 10000 }).should(
      'exist'
    );
    cy.contains('.community-blueprint-card__trust', 'Community').should('exist');
  });

  it('enforces contribution flow for curated blueprints that are not yet available', () => {
    cy.visit('/?view=communityBlueprintsView');

    cy.get('.community-blueprint-card[data-availability-status="Needs Contribution"]')
      .first()
      .as('needsContributionCard');

    cy.get('@needsContributionCard').within(() => {
      cy.contains('button', 'Contribute with AI').should('have.class', 'btn--primary');
      cy.get('[data-action="install-blueprint-card"]').should('be.disabled');
      cy.get('[data-action="install-blueprint-card"]').should('contain.text', 'Install Locked');
    });

    cy.get('@needsContributionCard').find('[data-action="open-preview"]').click();
    cy.get('#blueprintPreviewModal').should('be.visible');
    cy.get('#blueprintPreviewInstallBtn')
      .should('be.disabled')
      .and('contain.text', 'Install Locked');
    cy.get('#blueprintPreviewContributeBtn')
      .should('be.visible')
      .and('contain.text', 'Contribute with AI')
      .and('have.class', 'btn--primary')
      .click();

    cy.contains('.toast-message', 'Enable AI and add your API key', { timeout: 10000 }).should(
      'exist'
    );
  });
});
